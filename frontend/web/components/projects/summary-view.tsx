"use client";

import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  Flag,
  ListChecks,
  Users,
} from "lucide-react";
import {
  TaskPriority,
  TaskStatus,
  type ProjectMember,
  type Task,
} from "@/types/project";

const DAY = 24 * 60 * 60 * 1000;

function isWithinLastDays(value?: string, days = 7): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  const now = Date.now();
  return time >= now - days * DAY && time <= now;
}

function formatRelative(value?: string): string {
  if (!value) return "Chưa có dữ liệu";
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function formatDate(value?: string): string {
  if (!value) return "Chưa đặt";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function getTaskType(task: Task): "Task" | "Epic" | "Subtask" {
  if (task.isParentTask) return "Epic";
  if (task.parentTaskId) return "Subtask";
  return "Task";
}

function MetricCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof CheckCircle2;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`grid h-9 w-9 place-items-center rounded-md ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-2xl font-bold text-[#172B4D]">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[11px] text-slate-400">trong 7 ngày gần nhất</p>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-[#172B4D]">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SummaryView({
  tasks,
  members,
}: {
  tasks: Task[];
  members: ProjectMember[];
}) {
  const activeTasks = tasks.filter((task) => !task.archived);
  const workItems = activeTasks.filter((task) => !task.isParentTask);
  const completed = workItems.filter((task) => task.status === TaskStatus.DONE);
  const completedRecently = completed.filter((task) => isWithinLastDays(task.updatedAt));
  const updatedRecently = workItems.filter((task) => isWithinLastDays(task.updatedAt));
  const createdRecently = workItems.filter((task) => isWithinLastDays(task.createdAt));
  const dueSoon = workItems.filter((task) => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    const due = new Date(task.dueDate).getTime();
    return due >= Date.now() && due <= Date.now() + 7 * DAY;
  });

  const statusItems = [
    { label: "To Do", value: workItems.filter((task) => task.status === TaskStatus.TODO).length, color: "#4C9AFF" },
    { label: "In Progress", value: workItems.filter((task) => task.status === TaskStatus.IN_PROGRESS).length, color: "#0052CC" },
    { label: "In Review", value: workItems.filter((task) => task.status === TaskStatus.IN_REVIEW).length, color: "#FFAB00" },
    { label: "Done", value: completed.length, color: "#36B37E" },
  ];
  const totalStatus = statusItems.reduce((sum, item) => sum + item.value, 0);
  const donePercent = totalStatus ? Math.round((completed.length / totalStatus) * 100) : 0;

  const priorityItems = [
    { label: "Urgent", value: workItems.filter((task) => task.priority === TaskPriority.URGENT).length, color: "bg-red-500" },
    { label: "High", value: workItems.filter((task) => task.priority === TaskPriority.HIGH).length, color: "bg-orange-400" },
    { label: "Medium", value: workItems.filter((task) => task.priority === TaskPriority.MEDIUM).length, color: "bg-blue-500" },
    { label: "Low", value: workItems.filter((task) => task.priority === TaskPriority.LOW).length, color: "bg-slate-400" },
  ];
  const maxPriority = Math.max(1, ...priorityItems.map((item) => item.value));

  const typeItems = ["Task", "Epic", "Subtask"].map((label) => ({
    label,
    value: activeTasks.filter((task) => getTaskType(task) === label).length,
  }));
  const maxType = Math.max(1, ...typeItems.map((item) => item.value));

  const recentTasks = [...activeTasks]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 5);

  const workload = members.map((member) => ({
    name: member.displayName,
    count: workItems.filter((task) => task.assignees?.some((assignee) => assignee.userId === member.userId)).length,
  }));
  const assignedCount = workload.reduce((sum, item) => sum + item.count, 0);
  const unassignedCount = Math.max(0, workItems.length - assignedCount);
  const workloadItems = [
    { name: "Chưa phân công", count: unassignedCount },
    ...workload.filter((item) => item.count > 0),
  ];
  const maxWorkload = Math.max(1, ...workloadItems.map((item) => item.count));

  const sprintItems = activeTasks
    .filter((task) => task.isParentTask)
    .map((sprint) => {
      const children = activeTasks.filter((task) => task.parentTaskId === sprint.id);
      const done = children.filter((task) => task.status === TaskStatus.DONE).length;
      return { sprint, total: children.length, done, percent: children.length ? Math.round((done / children.length) * 100) : 0 };
    })
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 pb-8">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-sm font-bold text-[#172B4D]">Customize your reports to suit your space</p>
        <p className="mt-1 text-xs text-slate-600">Theo dõi nhanh tiến độ, trạng thái và khối lượng công việc của project.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={CheckCircle2} value={completedRecently.length} label="Đã hoàn thành" color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={Activity} value={updatedRecently.length} label="Đã cập nhật" color="bg-blue-50 text-blue-600" />
        <MetricCard icon={ListChecks} value={createdRecently.length} label="Đã tạo mới" color="bg-violet-50 text-violet-600" />
        <MetricCard icon={CalendarClock} value={dueSoon.length} label="Sắp đến hạn" color="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Tổng quan trạng thái" description="Snapshot trạng thái của các work items trong project.">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
            <div
              className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(#36B37E ${donePercent}%, #DEEBFF ${donePercent}% 100%)` }}
            >
              <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center">
                <div><p className="text-2xl font-bold text-[#172B4D]">{totalStatus}</p><p className="text-[11px] text-slate-500">Total work items</p></div>
              </div>
            </div>
            <div className="w-full max-w-xs space-y-2">
              {statusItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />{item.label}</span>
                  <strong className="text-slate-700">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Recent activity" description="Những thay đổi gần đây trong project.">
          <div className="space-y-3">
            {recentTasks.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Chưa có hoạt động.</p>}
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-700"><CircleDot className="h-4 w-4" /></span>
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-[#172B4D]">{task.title}</p><p className="mt-0.5 text-[11px] text-slate-400">{task.status} · {formatRelative(task.updatedAt || task.createdAt)}</p></div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Priority breakdown" description="Phân bổ mức độ ưu tiên của work items.">
          <div className="space-y-3">
            {priorityItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[70px_1fr_28px] items-center gap-3 text-xs">
                <span className="text-slate-600">{item.label}</span>
                <div className="h-5 rounded-sm bg-slate-100"><div className={`h-5 rounded-sm ${item.color}`} style={{ width: `${(item.value / maxPriority) * 100}%` }} /></div>
                <strong className="text-right text-slate-700">{item.value}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Types of work" description="Phân loại công việc trong project.">
          <div className="space-y-3">
            {typeItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[75px_1fr_28px] items-center gap-3 text-xs">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />{item.label}</span>
                <div className="h-5 rounded-sm bg-slate-100"><div className="h-5 rounded-sm bg-slate-500" style={{ width: `${(item.value / maxType) * 100}%` }} /></div>
                <strong className="text-right text-slate-700">{item.value}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Team workload" description="Theo dõi khối lượng task theo người phụ trách.">
          <div className="space-y-3">
            {workloadItems.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Chưa có thành viên.</p>}
            {workloadItems.map((item) => (
              <div key={item.name} className="grid grid-cols-[130px_1fr_28px] items-center gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 truncate text-slate-600"><Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />{item.name}</span>
                <div className="h-5 rounded-sm bg-slate-100"><div className="h-5 rounded-sm bg-slate-500" style={{ width: `${(item.count / maxWorkload) * 100}%` }} /></div>
                <strong className="text-right text-slate-700">{item.count}</strong>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Sprint progress" description="Tiến độ hoàn thành của các task lớn.">
          <div className="space-y-4">
            {sprintItems.length === 0 && <p className="py-8 text-center text-xs text-slate-400">Chưa có sprint.</p>}
            {sprintItems.map(({ sprint, total, done, percent }) => (
              <div key={sprint.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-700">{sprint.title}</span><span className="shrink-0 text-slate-500">{done}/{total}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${percent}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
