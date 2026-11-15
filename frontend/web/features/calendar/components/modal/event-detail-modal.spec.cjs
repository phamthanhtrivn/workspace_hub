const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { createSourceLoader, repositoryRoot } = require('../../../../../../tests/support/typescript.cjs');

const load = createSourceLoader(path.join(repositoryRoot, 'frontend/web'));
const Empty = () => null;
const DialogSurface = () => null;
const CalendarConfirmDialog = () => null;

function descendants(node) {
  return React.Children.toArray(node).flatMap(child =>
    React.isValidElement(child) ? [child, ...descendants(child.props.children)] : []);
}

function detailFixture(sourceType, recurrence = { recurrenceRule: 'FREQ=DAILY' }) {
  const state = [];
  let cursor = 0;
  const deleted = [];
  let closed = 0;
  const { EventDetailModal } = load('features/calendar/components/modal/event-detail-modal.tsx', {
    react: {
      ...React,
      useRef: value => ({ current: value }),
      useState: initial => {
        const index = cursor++;
        if (!(index in state)) state[index] = initial;
        return [state[index], value => { state[index] = value; }];
      },
    },
    '@/store/store': { useAppSelector: selector => selector({ auth: { userId: 'owner' } }) },
    '../../hooks/use-calendar-queries': { useCalendarEvent: () => ({}), useRetryCalendarConference: () => ({}) },
    './calendar-event-readonly-details': { CalendarEventReadonlyDetails: Empty },
    './calendar-event-recurrence-details': { CalendarEventRecurrenceDetails: Empty },
    '@/features/pomodoro/components/task-focus-button': { CalendarTaskFocusButton: Empty },
    '@/features/pomodoro/components/task-focus-history': { TaskFocusHistory: Empty },
    '@/components/ui/dialog': { DialogSurface },
    '../ui/calendar-confirm-dialog': { CalendarConfirmDialog },
  });
  const event = {
    id: 'recurring-entry', title: 'Calendar entry', sourceType,
    startAt: '2030-01-01T09:00:00Z', endAt: '2030-01-01T10:00:00Z',
    permissions: { canManage: true }, ...recurrence,
  };
  return {
    deleted,
    get closed() { return closed; },
    render() {
      cursor = 0;
      const original = Object.getOwnPropertyDescriptor(globalThis, 'document');
      Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
      try {
        return EventDetailModal({
          open: true, event, onClose: () => closed++,
          onCancelEvent: scope => deleted.push(scope),
          onEdit() {}, onRespond() {}, onTaskCompletionChange() {},
        });
      } finally {
        if (original) Object.defineProperty(globalThis, 'document', original);
        else delete globalThis.document;
      }
    },
  };
}

for (const [sourceType, noun] of [['TASK', 'task'], ['USER', 'event']]) {
  test(`recurring ${noun}: correct labels, cancel preserves detail, scopes delete only on confirmation`, () => {
    const fixture = detailFixture(sourceType);
    const openDelete = () => {
      const tree = fixture.render();
      descendants(tree).find(node => node.props['aria-label'] === `Delete ${noun}`).props.onClick();
      return fixture.render();
    };
    const first = openDelete();
    const dialog = descendants(first).find(node => node.type === CalendarConfirmDialog);
    assert.equal(dialog.props.title, `Delete recurring ${noun}`);
    assert.equal(dialog.props.confirmLabel, `Delete ${noun}`);
    assert.equal(dialog.props.nested, true);
    assert.equal(dialog.props.children.props.ariaLabel, `Delete ${noun}`);
    assert.deepEqual(dialog.props.children.props.options.map(option => option.label), [
      `This ${noun}`, `This and following ${noun}s`, `All ${noun}s in series`,
    ]);
    // A sibling portal must not bubble wheel/touch events into the detail's scroll guards.
    assert.equal(descendants(first.props.children[0]).some(node => node.type === CalendarConfirmDialog), false);
    dialog.props.children.props.onChange('ALL');
    dialog.props.onCancel();
    const cancelled = fixture.render();
    assert.ok(descendants(cancelled).some(node => node.type === DialogSurface));
    assert.ok(!descendants(cancelled).some(node => node.type === CalendarConfirmDialog));
    assert.equal(fixture.closed, 0);
    assert.deepEqual(fixture.deleted, []);

    for (const scope of ['THIS', 'THIS_AND_FOLLOWING', 'ALL']) {
      const reopened = descendants(openDelete()).find(node => node.type === CalendarConfirmDialog);
      assert.equal(reopened.props.children.props.value, 'THIS');
      reopened.props.children.props.onChange(scope);
      descendants(fixture.render()).find(node => node.type === CalendarConfirmDialog).props.onConfirm();
    }
    assert.deepEqual(fixture.deleted, ['THIS', 'THIS_AND_FOLLOWING', 'ALL']);
  });
}

test('nested confirmation dims above the detail, focuses Cancel and uses its own dismissal callback', () => {
  const { CalendarConfirmDialog: Confirm } = load('features/calendar/components/ui/calendar-confirm-dialog.tsx');
  let cancelled = 0;
  const props = { open: true, nested: true, title: 'Delete recurring task', onCancel: () => cancelled++, onConfirm() {} };
  const tree = Confirm(props);
  assert.equal(tree.props.closeOnOutsideClick, false);
  assert.match(tree.props.children.props.overlayClassName, /z-\[120\].*backdrop-blur-sm/);
  assert.match(tree.props.children.props.className, /z-\[130\]/);
  const cancel = descendants(tree).find(node => node.props.children === 'Cancel');
  assert.equal(cancel.props['data-modal-initial-focus'], true);
  cancel.props.onClick();
  tree.props.onOpenChange(false); // Shared dialog routes Escape here.
  assert.equal(cancelled, 2);
  Confirm({ ...props, isLoading: true }).props.onOpenChange(false);
  assert.equal(cancelled, 2);
  const standard = Confirm({ ...props, nested: false });
  assert.equal(standard.props.closeOnOutsideClick, true);
  assert.equal(standard.props.children.props.overlayClassName, undefined);
});
