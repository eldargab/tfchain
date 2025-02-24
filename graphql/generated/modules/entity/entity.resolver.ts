import {
  Arg,
  Args,
  Mutation,
  Query,
  Root,
  Resolver,
  FieldResolver,
  ObjectType,
  Field,
  Int,
  ArgsType,
  Info,
  Ctx
} from 'type-graphql';
import graphqlFields from 'graphql-fields';
import { Inject } from 'typedi';
import { Min } from 'class-validator';
import { Fields, StandardDeleteResponse, UserId, PageInfo, RawFields, NestedFields, BaseContext } from 'warthog';

import {
  EntityCreateInput,
  EntityCreateManyArgs,
  EntityUpdateArgs,
  EntityWhereArgs,
  EntityWhereInput,
  EntityWhereUniqueInput,
  EntityOrderByEnum
} from '../../warthog';

import { Entity } from './entity.model';
import { EntityService } from './entity.service';

@ObjectType()
export class EntityEdge {
  @Field(() => Entity, { nullable: false })
  node!: Entity;

  @Field(() => String, { nullable: false })
  cursor!: string;
}

@ObjectType()
export class EntityConnection {
  @Field(() => Int, { nullable: false })
  totalCount!: number;

  @Field(() => [EntityEdge], { nullable: false })
  edges!: EntityEdge[];

  @Field(() => PageInfo, { nullable: false })
  pageInfo!: PageInfo;
}

@ArgsType()
export class ConnectionPageInputOptions {
  @Field(() => Int, { nullable: true })
  @Min(0)
  first?: number;

  @Field(() => String, { nullable: true })
  after?: string; // V3: TODO: should we make a RelayCursor scalar?

  @Field(() => Int, { nullable: true })
  @Min(0)
  last?: number;

  @Field(() => String, { nullable: true })
  before?: string;
}

@ArgsType()
export class EntityConnectionWhereArgs extends ConnectionPageInputOptions {
  @Field(() => EntityWhereInput, { nullable: true })
  where?: EntityWhereInput;

  @Field(() => EntityOrderByEnum, { nullable: true })
  orderBy?: [EntityOrderByEnum];
}

@Resolver(Entity)
export class EntityResolver {
  constructor(@Inject('EntityService') public readonly service: EntityService) {}

  @Query(() => [Entity])
  async entities(
    @Args() { where, orderBy, limit, offset }: EntityWhereArgs,
    @Fields() fields: string[]
  ): Promise<Entity[]> {
    return this.service.find<EntityWhereInput>(where, orderBy, limit, offset, fields);
  }

  @Query(() => Entity, { nullable: true })
  async entityByUniqueInput(
    @Arg('where') where: EntityWhereUniqueInput,
    @Fields() fields: string[]
  ): Promise<Entity | null> {
    const result = await this.service.find(where, undefined, 1, 0, fields);
    return result && result.length >= 1 ? result[0] : null;
  }

  @Query(() => EntityConnection)
  async entitiesConnection(
    @Args() { where, orderBy, ...pageOptions }: EntityConnectionWhereArgs,
    @Info() info: any
  ): Promise<EntityConnection> {
    const rawFields = graphqlFields(info, {}, { excludedFields: ['__typename'] });

    let result: any = {
      totalCount: 0,
      edges: [],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false
      }
    };
    // If the related database table does not have any records then an error is thrown to the client
    // by warthog
    try {
      result = await this.service.findConnection<EntityWhereInput>(where, orderBy, pageOptions, rawFields);
    } catch (err) {
      console.log(err);
      // TODO: should continue to return this on `Error: Items is empty` or throw the error
      if (!(err.message as string).includes('Items is empty')) throw err;
    }

    return result as Promise<EntityConnection>;
  }
}
