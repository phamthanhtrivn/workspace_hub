"""Real Chromium UI test with mocked APIs. Run against `npm start -- --port 3100`.
Requires Python Playwright + Chromium. No real accounts or database are used.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parents[1] / "artifacts" / "pomodoro-review"
A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"
CAL = "33333333-3333-4333-8333-333333333333"
TASK_A = "44444444-4444-4444-8444-444444444444"
TASK_B = "55555555-5555-4555-8555-555555555555"
DEFAULT = dict(focusDuration=1, shortBreak=1, longBreak=2, longBreakInterval=2,
               autoStartBreak=False, autoStartFocus=False, soundEnabled=False,
               soundType="chime", soundVolume=0.7, notificationEnabled=False, dailyGoalPomodoros=8)


def now():
    return datetime.now(timezone.utc).isoformat()


class ApiFixture:
    def __init__(self):
        self.user, self.configs, self.states, self.sessions, self.fail = A, {}, {}, [], False

    def route(self, route):
        req = route.request
        path = urlparse(req.url).path
        headers = {"Access-Control-Allow-Origin": "http://localhost:3100", "Access-Control-Allow-Credentials": "true",
                   "Access-Control-Allow-Headers": "authorization,content-type,accept",
                   "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS"}
        if req.method == "OPTIONS":
            route.fulfill(status=204, headers=headers)
            return
        payload = req.post_data_json if req.post_data else {}
        data, status = [], 200
        cfg = self.configs.setdefault(self.user, dict(DEFAULT))
        if path.endswith("/auth/refresh"):
            data = dict(accessToken="test-only", userId=self.user, role="USER", email="qa@example.invalid", fullName="Pomodoro QA")
        elif path.endswith("/users/me/profile"):
            data = dict(id=self.user, fullName="Pomodoro QA", email="qa@example.invalid")
        elif path.endswith("/unread-count"):
            data = {"unreadCount": 0}
        elif path.endswith("/pomodoro/config"):
            if req.method == "PUT": cfg.update(payload)
            data = cfg
        elif path.endswith("/pomodoro/state"):
            if req.method == "PUT":
                old = self.states.get(self.user) or {}
                self.states[self.user] = dict(payload, version=old.get("version", 0) + 1, updatedAt=now())
            data = self.states.get(self.user)
        elif path.endswith("/pomodoro/sessions"):
            if req.method == "POST":
                if self.fail: status, data = 503, None
                else:
                    data = dict(payload, id=str(len(self.sessions) + 1), userId=self.user, durationMinutes=round(payload["actualSeconds"] / 60))
                    self.sessions.append(data)
            else:
                records = [s for s in self.sessions if s["userId"] == self.user]
                data = {"sessions": records, "pagination": {"page": 1, "totalPages": 1, "totalItems": len(records)}}
        elif path.endswith("/pomodoro/stats/daily"):
            records = [s for s in self.sessions if s["userId"] == self.user and s["sessionType"] == "FOCUS"]
            data = dict(date=now()[:10], totalFocusMinutes=round(sum(s["actualSeconds"] for s in records) / 60),
                        completedPomodoros=sum(s["status"] == "COMPLETED" for s in records),
                        completedTasks=0, dailyGoalPomodoros=cfg["dailyGoalPomodoros"], currentStreak=0)
        elif path.endswith("/calendar/calendars"):
            data = [dict(id=CAL, name="Personal", isDefault=True, projectId=None)]
        elif path.endswith("/calendar/events"):
            data = [dict(id=id_, calendarId=CAL, title=title, sourceType="TASK", startAt=now()[:10]+"T00:00:00Z",
                         endAt=now()[:10]+"T23:59:59Z", status="CONFIRMED", completedAt=None, sourceId=None, taskOrder=i)
                    for i, (id_, title) in enumerate([(TASK_A, "QA Task A"), (TASK_B, "QA Task B")])]
        route.fulfill(status=status, headers=headers, content_type="application/json", body=json.dumps({"success": status < 400, "data": data}))


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, fixture = [], ApiFixture()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, timezone_id="Asia/Ho_Chi_Minh")
        context.route("**/api/**", fixture.route)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.clock.install()
        page.goto("http://localhost:3100/pomodoro")
        expect(page.get_by_role("heading", name="Pomodoro Focus Hub")).to_be_visible()
        page.get_by_title("QA Task A", exact=True).click()
        page.get_by_role("button", name="BẮT ĐẦU FOCUS", exact=True).click()
        page.clock.fast_forward(10_000)
        page.get_by_role("button", name="TẠM DỪNG", exact=True).click()
        expect(page.get_by_text("00:50", exact=True)).to_be_visible()
        page.reload()
        expect(page.get_by_role("button", name="TIẾP TỤC", exact=True)).to_be_visible()
        expect(page.get_by_text("00:50", exact=True)).to_be_visible()
        checks.append("Start/pause/reload retain remaining time")
        page.get_by_title("QA Task B", exact=True).click()
        expect(page.get_by_role("button", name="BẮT ĐẦU FOCUS", exact=True)).to_be_visible()
        assert fixture.sessions[-1]["taskId"] == TASK_A and fixture.sessions[-1]["actualSeconds"] == 10
        checks.append("Task switch attributes time to previous task")
        page.get_by_role("button", name="Mở cài đặt Pomodoro").click()
        dialog = page.get_by_role("dialog")
        dialog.get_by_role("spinbutton").nth(0).fill("2")
        dialog.get_by_role("spinbutton").nth(4).fill("4")
        dialog.get_by_role("button", name="Lưu cài đặt").click()
        expect(page.get_by_text("0 / 4 phiên", exact=True)).to_be_visible()
        page.get_by_role("button", name="BẮT ĐẦU FOCUS", exact=True).click()
        page.clock.fast_forward(30_000)
        page.get_by_role("button", name="TẠM DỪNG", exact=True).click()
        page.get_by_role("button", name="Mở cài đặt Pomodoro").click()
        page.get_by_role("dialog").get_by_role("spinbutton").nth(0).fill("3")
        page.get_by_role("button", name="Lưu cài đặt").click()
        page.reload()
        expect(page.get_by_text("01:30", exact=True)).to_be_visible()
        checks.append("Daily goal updates; original session duration survives settings change/reload")
        page.get_by_role("button", name="Ghi chú nhanh trong lúc tập trung").click()
        note = page.get_by_placeholder("Ghi lại nhanh ý tưởng, bug phát hiện, hoặc điều cần nhớ...")
        note.fill("x" * 2100)
        assert len(note.input_value()) == 2000
        fixture.fail = True
        page.get_by_title("Đặt lại phiên (Reset)").click()
        expect(page.get_by_text("Chưa lưu được phiên. Đã tạm dừng và giữ dữ liệu; hãy thử lại.", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="TIẾP TỤC", exact=True)).to_be_enabled()
        fixture.fail = False
        page.get_by_title("Đặt lại phiên (Reset)").click()
        expect(page.get_by_role("button", name="BẮT ĐẦU FOCUS", exact=True)).to_be_enabled()
        assert fixture.sessions[-1]["actualSeconds"] == 30 and fixture.sessions[-1]["plannedSeconds"] == 120
        checks.append("Notes capped at 2000; failed reset preserves session and retry saves it")
        page.get_by_role("button", name="BẮT ĐẦU FOCUS", exact=True).click()
        page.clock.fast_forward(180_000)
        expect(page.get_by_role("button", name="BẮT ĐẦU NGHỈ NGẮN", exact=True)).to_be_visible()
        assert fixture.sessions[-1]["status"] == "COMPLETED" and fixture.sessions[-1]["actualSeconds"] == 180
        expect(page.get_by_text("1 / 4 phiên", exact=True)).to_be_visible()
        checks.append("Completion advances cycle and refreshes stats")
        with page.expect_download() as download:
            page.get_by_role("button", name="Xuất JSON").click()
        download.value.save_as(OUT / "report-export.json")
        assert json.loads((OUT / "report-export.json").read_text(encoding="utf-8"))["summary"]["completedFocusSessions"] == 1
        checks.append("Report JSON exports correct completed focus count")
        page.locator("main").evaluate("el => el.scrollTop = 0")
        page.screenshot(path=str(OUT / "desktop.png"), full_page=True, animations="disabled")
        page.set_viewport_size({"width": 390, "height": 844})
        page.clock.run_for(500)
        page.locator("main").evaluate("el => el.scrollTop = 0")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        page.screenshot(path=str(OUT / "mobile.png"), full_page=True, animations="disabled")
        overflow = page.locator("main").evaluate("""main => {
            const bounds = main.getBoundingClientRect();
            return [...main.querySelectorAll('*')].filter(el => {
                const rect = el.getBoundingClientRect();
                return rect.width && (rect.right > bounds.right + 1 || rect.left < bounds.left - 1);
            }).map(el => ({tag: el.tagName, classes: el.getAttribute('class'), width: el.getBoundingClientRect().width}));
        }""")
        assert page.locator("main").evaluate("el => el.scrollWidth <= el.clientWidth + 1"), overflow
        checks.append("390px mobile view has no horizontal document or main content overflow")
        page.set_viewport_size({"width": 320, "height": 740})
        page.clock.run_for(500)
        assert page.locator("main").evaluate("el => el.scrollWidth <= el.clientWidth + 1"), "320px main content overflows"
        page.screenshot(path=str(OUT / "mobile-320.png"), full_page=True, animations="disabled")
        checks.append("320px narrow mobile view fits timer and controls")
        fixture.user = B
        page.reload()
        expect(page.get_by_placeholder("Bạn muốn tập trung làm gì trong phiên này?...")).to_be_visible()
        expect(page.get_by_text("01:00", exact=True)).to_be_visible()
        checks.append("Account B does not inherit account A timer/task/notes")
        assert not errors, errors
        checks.append("No uncaught browser JavaScript errors")
        browser.close()
    result = {"apiMode": "mocked", "realDatabaseVerified": False, "checks": checks}
    (OUT / "smoke-results.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run()
