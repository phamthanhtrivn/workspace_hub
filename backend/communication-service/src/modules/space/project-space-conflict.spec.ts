import { SpaceService } from './space.service';

describe('Project space uniqueness conflicts', () => {
  it.each([
    { target: ['project_id'], code: 'P2002', retry: true },
    { target: 'spaces_project_id_key', code: 'P2002', retry: true },
    { target: ['name', 'created_by'], code: 'P2002', retry: false },
    { target: undefined, code: 'P2002', retry: false },
    { target: 123, code: 'P2002', retry: false },
    {
      target: { toString: () => 'project_id' },
      code: 'P2002',
      retry: false,
    },
    { target: ['project_id'], code: 'P2021', retry: false },
  ])('retries only a project unique-key conflict: %p', async (scenario) => {
    const conflict = { code: scenario.code, meta: { target: scenario.target } };
    const retryBoundary = new Error('Retry reached the transaction boundary');
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(retryBoundary);
    type Dependencies = ConstructorParameters<typeof SpaceService>;
    const service = new SpaceService(
      { $transaction: transaction } as unknown as Dependencies[0],
      {} as Dependencies[1],
      {} as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
      {} as Dependencies[5],
    );

    await expect(
      service.ensureProjectSpace({
        projectId: 'project-one',
        name: 'Project one',
        ownerId: 'owner-one',
        members: [],
      }),
    ).rejects.toBe(scenario.retry ? retryBoundary : conflict);
    expect(transaction).toHaveBeenCalledTimes(scenario.retry ? 2 : 1);
  });
});
