import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateLabelDto } from '../modules/label/dto/create-label.dto';
import { CreateProjectDto } from '../modules/project/dto/create-project.dto';
import { CreateTaskDto } from '../modules/task/dto/create-task.dto';

describe('Trim validation', () => {
  it('rejects whitespace-only names and titles', () => {
    const values: object[] = [
      plainToInstance(CreateProjectDto, { name: '   ' }),
      plainToInstance(CreateTaskDto, { title: '   ' }),
      plainToInstance(CreateLabelDto, { name: '   ' }),
    ];

    values.forEach((value) => expect(validateSync(value)).not.toHaveLength(0));
  });

  it('normalizes surrounding whitespace before validation', () => {
    const value = plainToInstance(CreateProjectDto, { name: '  Workspace Hub  ' });

    expect(validateSync(value)).toHaveLength(0);
    expect(value.name).toBe('Workspace Hub');
  });
});
