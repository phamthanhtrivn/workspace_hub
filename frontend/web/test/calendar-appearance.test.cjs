const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(relative, stubs = {}, cache = new Map()) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const target = new Module(filename, module);
  target.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, target);
  const originalRequire = target.require.bind(target);
  target.require = request => {
    if (Object.hasOwn(stubs, request)) return stubs[request];
    if (!request.startsWith('.') && !request.startsWith('@/')) return originalRequire(request);
    const absolute = request.startsWith('@/') ? path.resolve(__dirname, '..', request.slice(2)) : path.resolve(path.dirname(filename), request);
    const dependency = ['.ts', '.tsx'].map(extension => absolute + extension).find(candidate => fs.existsSync(candidate));
    return load(path.relative(path.resolve(__dirname, '..'), dependency), stubs, cache);
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(child => find(child, predicate)).find(Boolean);
  return predicate(node) ? node : find(node.props?.children, predicate);
}

test('HEX normalization and HSV conversion preserve saved colors including short HEX', () => {
  const { normalizeHexColor, hexToHsv, hsvToHex, colorAreaPosition } = load('components/ui/custom/color-picker.utils.ts');
  for (const hex of ['#22396F', '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#14B8A6']) {
    assert.equal(hsvToHex(hexToHsv(hex)), hex);
  }
  assert.equal(normalizeHexColor(' #36f '), '#3366FF');
  assert.equal(normalizeHexColor('abcdef'), '#ABCDEF');
  for (const invalid of ['', '#12', '#GGGGGG', 'red', '#12345678']) assert.equal(normalizeHexColor(invalid), null);
  assert.deepEqual(colorAreaPosition(-20, 200, 100, 100), { saturation: 0, value: 0 });
  assert.deepEqual(colorAreaPosition(150, -10, 100, 100), { saturation: 100, value: 100 });
});

test('Project and Calendar use the same icon and color catalog without changing Project defaults', () => {
  const cache = new Map();
  const project = load('features/project/constants/project-form.constants.ts', {}, cache);
  const calendar = load('features/calendar/types/calendar.constants.ts', {}, cache);
  assert.equal(project.PROJECT_COLOR_OPTIONS, calendar.CALENDAR_COLOR_CHOICES);
  assert.equal(project.PROJECT_ICON_OPTIONS, calendar.CALENDAR_ICON_CHOICES);
  assert.equal(project.PROJECT_COLOR_OPTIONS[0], '#6366f1');
  assert.equal(project.PROJECT_ICON_OPTIONS[0], '🚀');
  assert.ok(project.PROJECT_ICON_OPTIONS.length > 16);
});

test('visual custom color stays a draft until Apply and invalid HEX cannot be applied', () => {
  let cursor = 0, cancelled = 0;
  const cells = [], applied = [];
  const { CustomColorEditor } = load('components/ui/custom/custom-color-editor.tsx', {
    react: { ...require('react'), useId: () => 'color', useState: initial => {
      const index = cursor++;
      if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
      return [cells[index], next => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
    } },
    '@/components/ui/button': { Button: () => null },
    '@/components/ui/input': { Input: () => null },
  });
  const render = () => { cursor = 0; return CustomColorEditor({ value: '#FF0000', onApply: color => applied.push(color), onCancel: () => { cancelled++; } }); };
  let tree = render();
  find(tree, node => node.props?.type === 'range').props.onChange({ target: { value: '120' } });
  tree = render();
  assert.equal(find(tree, node => node.props?.id === 'color-hex').props.value, '#00FF00');
  assert.deepEqual(applied, []);
  find(tree, node => node.props?.role === 'slider').props.onPointerDown({
    pointerId: 1, clientX: 50, clientY: 25,
    currentTarget: { focus() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) },
  });
  tree = render();
  assert.equal(find(tree, node => node.props?.id === 'color-hex').props.value, '#60BF60');
  find(tree, node => node.props?.children === 'Apply').props.onClick();
  assert.deepEqual(applied, ['#60BF60']);
  find(tree, node => node.props?.id === 'color-hex').props.onChange({ target: { value: '#invalid' } });
  tree = render();
  assert.equal(find(tree, node => node.props?.children === 'Apply').props.disabled, true);
  find(tree, node => node.props?.id === 'color-hex').props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(applied, ['#60BF60']);
  find(tree, node => node.props?.children === 'Cancel').props.onClick();
  assert.equal(cancelled, 1);
});

test('Calendar name opens editing while checkbox remains a separate visibility action', () => {
  let toggles = 0;
  const state = [];
  const { CalendarListItem } = load('features/calendar/components/sidebar/calendar-list-item.tsx', {
    react: { ...require('react'), useState: initial => [initial, next => state.push(next)] },
    'sonner': { toast: {} },
    '../../hooks/use-calendar-queries': { useUpdateCalendar: () => ({ isPending: false }), useDeleteCalendar: () => ({ isPending: false }) },
    '../modal/calendar-modal': { CalendarModal: () => null },
    '../modal/delete-calendar-modal': { DeleteCalendarModal: () => null },
    './calendar-color-popover': { CalendarColorPopover: () => null },
    '@/components/ui/button': { Button: () => null },
    '@/components/ui/checkbox': { Checkbox: () => null },
  });
  const tree = CalendarListItem({ calendar: { id: 'calendar', name: 'Personal', color: '#2563eb', icon: '📅', isDefault: true }, selected: true, onToggle: () => { toggles++; } });
  const edit = find(tree, node => node.props?.['aria-label'] === 'Edit calendar Personal');
  assert.ok(edit);
  edit.props.onClick();
  assert.deepEqual(state, [true]);
  assert.equal(toggles, 0);
  const visibility = find(tree, node => node.props?.onToggle);
  visibility.props.onToggle();
  assert.equal(toggles, 1);
});

test('Calendar outside click, Escape and close actions protect dirty edits and preserve pending saves', () => {
  const previousDocument = global.document;
  let popupOpen = false;
  global.document = { querySelector: () => popupOpen ? {} : null };
  try {
    let cursor = 0, closes = 0;
    const cells = [];
    const Surface = () => null, Confirm = () => null;
    const { CalendarModal } = load('features/calendar/components/modal/calendar-modal.tsx', {
      react: { ...require('react'), useRef: value => ({ current: value }), useState: initial => {
        const index = cursor++;
        if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial;
        return [cells[index], next => { cells[index] = typeof next === 'function' ? next(cells[index]) : next; }];
      } },
      sonner: { toast: { error: message => assert.fail(message) } },
      '@/components/ui/dialog': { DialogSurface: Surface },
      '@/components/ui/button': { Button: () => null },
      '@/components/ui/input': { Input: () => null },
      '../ui/calendar-confirm-dialog': { CalendarConfirmDialog: Confirm },
      '../sidebar/calendar-style-fields': { CalendarIconPicker: () => null, CalendarColorPicker: () => null },
    });
    const props = { mode: 'edit', initialValues: { name: 'Personal', icon: '📅', color: '#2563eb' }, pending: false, onClose: () => { closes++; }, onSave: async () => true };
    const render = () => { cursor = 0; return CalendarModal(props); };
    const surface = tree => find(tree, node => node.type === Surface);
    const confirmation = tree => find(tree, node => node.type === Confirm);
    let tree = render();
    const backdrop = find(tree, node => node.props?.onPointerDown);
    const target = {};
    backdrop.props.onPointerDown({ button: 0, currentTarget: target, target: {}, defaultPrevented: false });
    assert.equal(closes, 0, 'Clicking form content is not a dismiss action');
    popupOpen = true;
    backdrop.props.onPointerDown({ button: 0, currentTarget: target, target, defaultPrevented: false });
    assert.equal(closes, 0, 'An open picker handles outside clicks first');
    popupOpen = false;
    backdrop.props.onPointerDown({ button: 0, currentTarget: target, target, defaultPrevented: false });
    assert.equal(closes, 1);
    find(tree, node => node.props?.placeholder === 'Calendar name').props.onChange({ target: { value: 'Updated calendar' } });
    tree = render();
    surface(tree).props.onClose();
    tree = render();
    assert.equal(closes, 1);
    assert.equal(confirmation(tree).props.open, true);
    confirmation(tree).props.onCancel();
    tree = render();
    assert.equal(confirmation(tree).props.open, false);
    assert.equal(find(tree, node => node.props?.placeholder === 'Calendar name').props.value, 'Updated calendar');
    props.pending = true;
    surface(tree = render()).props.onClose();
    assert.equal(closes, 1);
    props.pending = false;
    surface(tree = render()).props.onClose();
    confirmation(render()).props.onConfirm();
    assert.equal(closes, 2);
  } finally {
    if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
  }
});
