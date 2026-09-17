import { wouldCreateDependencyCycle } from './dependency-cycle';

describe('wouldCreateDependencyCycle', () => {
  it('detects a direct cycle', () => {
    expect(wouldCreateDependencyCycle([], 'task-a', 'task-a')).toBe(true);
  });

  it('detects an indirect cycle', () => {
    const edges = [
      { predecessorTaskId: 'task-a', successorTaskId: 'task-b' },
      { predecessorTaskId: 'task-b', successorTaskId: 'task-c' },
    ];
    expect(wouldCreateDependencyCycle(edges, 'task-c', 'task-a')).toBe(true);
  });

  it('allows valid acyclic edges', () => {
    const edges = [
      { predecessorTaskId: 'task-a', successorTaskId: 'task-b' },
    ];
    expect(wouldCreateDependencyCycle(edges, 'task-b', 'task-c')).toBe(false);
  });
});
