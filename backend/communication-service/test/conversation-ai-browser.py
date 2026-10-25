"""Optional browser chat verification, invoked by conversation-ai-live.cjs --browser.
Authentication refresh/profile/settings are fixtures; chat HTTP, Socket.IO and AI are real.
The short-lived synthetic JWT is received through stdin and never printed.
"""
import json
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

fixture = json.load(sys.stdin)
errors = []
failed_requests = []
with sync_playwright() as runtime:
    browser = runtime.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1500, "height": 1000})
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("requestfailed", lambda request: failed_requests.append({"path": urlparse(request.url).path, "failure": request.failure}) if "/api/" in request.url else None)
    page.on("response", lambda response: failed_requests.append({"path": urlparse(response.url).path, "status": response.status}) if response.status >= 400 and "/api/" in response.url else None)
    headers = {"access-control-allow-origin": "http://localhost:3000", "access-control-allow-credentials": "true"}
    def api_fixture(route):
        path = urlparse(route.request.url).path
        if path == "/api/auth/refresh":
            data = {"accessToken": fixture["token"], "userId": fixture["actor"], "email": "qa@example.test", "role": "USER", "fullName": "Synthetic QA", "avatarUrl": None}
        elif path == "/api/users/me/profile":
            data = {"userId": fixture["actor"], "email": "qa@example.test", "fullName": "Synthetic QA", "avatarUrl": None, "phoneNumber": "", "bio": "", "hasPassword": True}
        elif path == "/api/users/me/settings":
            data = {"theme": "LIGHT", "language": "EN", "timezone": "ASIA_HO_CHI_MINH", "allowNewDirectMessages": True, "muteNotification": False}
        elif path.startswith("/api/notifications"):
            data = {"unreadCount": 0} if path.endswith("unread-count") else []
        else:
            return route.continue_()
        route.fulfill(status=200, content_type="application/json", headers=headers, body=json.dumps({"success": True, "data": data}))
    page.route("**/api/**", api_fixture)
    stage = "open chat"
    try:
        page.goto("http://localhost:3000/chat?spaceId=" + fixture["spaceId"] + "&channelId=" + fixture["channelId"], wait_until="domcontentloaded", timeout=90000)
        print(json.dumps({"browserStage": "open chat"}), flush=True)
        message = page.get_by_role("combobox", name="Message channel", exact=True)
        expect(message).to_be_visible(timeout=90000)
        if fixture.get("tableMessageId"):
            stage = "verify Markdown table desktop and mobile"
            table_row = page.locator("#msg-" + fixture["tableMessageId"])
            table = table_row.get_by_role("table")
            expect(table).to_be_visible(timeout=15000)
            assert table.get_by_role("columnheader").count() == 3
            assert table.get_by_role("cell").count() == 12
            table.scroll_into_view_if_needed()
            page.screenshot(path=str(Path(tempfile.gettempdir()) / "workspace-chat-table-desktop.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            region = table_row.get_by_role("region", name="Bảng trong tin nhắn")
            expect(region).to_be_visible(timeout=15000)
            region.scroll_into_view_if_needed()
            metrics = region.evaluate("el => ({width: el.clientWidth, scroll: el.scrollWidth, viewport: innerWidth, right: el.getBoundingClientRect().right})")
            assert metrics["width"] <= metrics["viewport"], "Table region exceeds viewport"
            assert metrics["right"] <= metrics["viewport"] + 1, "Table pushes chat beyond viewport"
            assert metrics["scroll"] > metrics["width"], "Wide table should scroll within the bubble"
            page.screenshot(path=str(Path(tempfile.gettempdir()) / "workspace-chat-table-mobile.png"), full_page=True)
            page.set_viewport_size({"width": 1500, "height": 1000})
            print(json.dumps({"markdownTablePassed": True, "headers": 3, "cells": 12, "mobileHorizontalScroll": True}), flush=True)
        if fixture.get("attachment"):
            stage = "open attachment summary menu"
            row = page.locator("#msg-" + fixture["attachment"]["messageId"])
            row.hover()
            row.get_by_role("button", name="Message options", exact=True).click()
            action = page.get_by_role("menuitem", name="Tóm tắt bằng AI", exact=True)
            expect(action).to_be_visible(timeout=15000)
            page.screenshot(path=str(Path(tempfile.gettempdir()) / "workspace-attachment-summary-menu.png"), full_page=True)
            action.click()
            expected_reply = page.get_by_text("Tóm tắt tài liệu: " + fixture["attachment"]["name"], exact=False)
        else:
            stage = "select AI mention"
            print(json.dumps({"browserStage": stage}), flush=True)
            message.fill("@ai")
            option = page.get_by_role("option", name="ai", exact=True)
            expect(option).to_be_visible(timeout=15000)
            option.click()
            expect(message).to_have_value("@ai ")
            message.fill("@ai Trả lời đúng một từ: BROWSER_OK")
            page.get_by_role("button", name="Send message", exact=True).click()
            expected_reply = page.get_by_text("BROWSER_OK", exact=True)
        stage = "wait for AI typing and reply"
        print(json.dumps({"browserStage": stage}), flush=True)
        typing = page.get_by_test_id("ai-typing-indicator")
        expect(typing).to_be_visible(timeout=30000)
        dots = typing.locator(".motion-safe\\:animate-bounce")
        assert dots.count() == 3, "Expected three animated typing dots"
        page.screenshot(path=str(Path(tempfile.gettempdir()) / "workspace-ai-typing.png"), full_page=True)
        print(json.dumps({"browserTypingVisible": True, "animatedDots": dots.count()}), flush=True)
        expect(expected_reply).to_be_visible(timeout=180000)
        if fixture.get("attachment"):
            reply_row = expected_reply.locator("xpath=ancestor::div[starts-with(@id, 'msg-')]")
            expect(reply_row).to_contain_text("420")
            expect(reply_row).to_contain_text("Lan")
            print(json.dumps({"attachmentSummaryPassed": True, "realPdfAndS3": True, "factsPreserved": ["420", "Lan"]}), flush=True)
        expect(typing).not_to_be_visible(timeout=5000)
        expect(message).to_have_value("")
        assert not errors, "Browser JavaScript error"
        screenshot = Path(tempfile.gettempdir()) / "workspace-ai-browser-20261024.png"
        page.screenshot(path=str(screenshot), full_page=True)
        print(json.dumps({"browserChatPassed": True, "authFixture": True, "chatAndModelReal": True, "pageErrors": errors, "otherHttpErrors": failed_requests[:10], "screenshot": str(screenshot)}))
    except Exception as error:
        page.screenshot(path=str(Path(tempfile.gettempdir()) / "workspace-ai-browser-failure-20261024.png"), full_page=True)
        print(json.dumps({"browserChatPassed": False, "stage": stage, "error": str(error)[:600], "pageErrors": errors[:3], "httpErrors": failed_requests[:10]}))
        raise SystemExit(1)
    finally:
        context.close()
        browser.close()
