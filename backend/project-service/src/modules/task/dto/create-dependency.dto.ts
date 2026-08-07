import { IsEnum, IsUUID } from 'class-validator';

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
}

export class CreateDependencyDto {
  @IsUUID()
  predecessorTaskId!: string;

  @IsEnum(DependencyType)
  dependencyType: DependencyType = DependencyType.FINISH_TO_START;
}
