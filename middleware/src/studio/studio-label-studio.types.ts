import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class StudioLabelStudioProject {
    @Field(() => Int) id!: number;
    @Field() name!: string;
    @Field() projectType!: string;
    @Field(() => Int) tasks!: number;
    @Field(() => Int) completed!: number;
    @Field(() => Int) annotators!: number;
    @Field({ nullable: true }) color?: string;
}

@ObjectType()
export class StudioLabelStudioRecentAnnotation {
    @Field() id!: string;
    @Field() taskLabel!: string;
    @Field() projectName!: string;
    @Field() label!: string;
    @Field() annotator!: string;
    @Field() updatedAt!: string;
}

@ObjectType()
export class StudioLabelStudioDashboard {
    @Field() configured!: boolean;
    @Field({ nullable: true }) openUrl?: string;
    @Field({ nullable: true }) message?: string;
    @Field(() => [StudioLabelStudioProject]) projects!: StudioLabelStudioProject[];
    @Field(() => [StudioLabelStudioRecentAnnotation]) recentAnnotations!: StudioLabelStudioRecentAnnotation[];
}
