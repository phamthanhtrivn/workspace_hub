import { wouldCreateDependencyCycle } from './dependency-cycle';

describe('wouldCreateDependencyCycle', () => {
  const edges = [
    { predecessorTaskId: 'a', successorTaskId: 'b' },
    { predecessorTaskId: 'b', successorTaskId: 'c' },
  ];

  it('detects an indirect cycle', () => {
    expect(wouldCreateDependencyCycle(edges, 'c', 'a')).toBe(true);
  });

  it('allows an acyclic dependency', () => {
    expect(wouldCreateDependencyCycle(edges, 'c', 'd')).toBe(false);
  });
});
