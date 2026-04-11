import { Prisma } from '@prisma/client'

function injectDeletedAtFilter(args: Record<string, any>): void {
  args.where ??= {}
  if (!('deletedAt' in args.where)) {
    args.where.deletedAt = null
  }
}

function createSoftDeleteWhere(where: Record<string, any> | undefined): Record<string, any> {
  const nextWhere = { ...(where ?? {}) }
  if (!('deletedAt' in nextWhere)) {
    nextWhere.deletedAt = null
  }
  return nextWhere
}

export const softDeleteExtension = Prisma.defineExtension({
  query: {
    $allModels: {
      async findFirst({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async findFirstOrThrow({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async findMany({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async findUnique({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async findUniqueOrThrow({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async count({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async aggregate({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async groupBy({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async update({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async updateMany({ args, query }) {
        injectDeletedAtFilter(args)
        return query(args)
      },

      async upsert({ args, query }) {
        args.where ??= {} as any
        if (!('deletedAt' in (args.where as any))) {
          (args.where as any).deletedAt = null
        }
        return query(args)
      },
    },
  },
  model: {
    $allModels: {
      async delete<T>(
        this: T,
        args: Prisma.Args<T, 'delete'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'delete'>, 'delete'>> {
        const context = Prisma.getExtensionContext(this) as unknown as {
          update: (args: Prisma.Args<T, 'update'>) => Promise<Prisma.Result<T, Prisma.Args<T, 'update'>, 'update'>>
        }

        return context.update({
          ...(args as Record<string, unknown>),
          where: createSoftDeleteWhere((args as { where?: Record<string, any> }).where),
          data: { deletedAt: new Date() },
        } as Prisma.Args<T, 'update'>) as Promise<Prisma.Result<T, Prisma.Args<T, 'delete'>, 'delete'>>
      },

      async deleteMany<T>(
        this: T,
        args?: Prisma.Args<T, 'deleteMany'>,
      ): Promise<Prisma.Result<T, Prisma.Args<T, 'deleteMany'>, 'deleteMany'>> {
        const context = Prisma.getExtensionContext(this) as unknown as {
          updateMany: (args: Prisma.Args<T, 'updateMany'>) => Promise<Prisma.Result<T, Prisma.Args<T, 'updateMany'>, 'updateMany'>>
        }

        return context.updateMany({
          ...((args ?? {}) as Record<string, unknown>),
          where: createSoftDeleteWhere((args as { where?: Record<string, any> } | undefined)?.where),
          data: { deletedAt: new Date() },
        } as Prisma.Args<T, 'updateMany'>) as Promise<Prisma.Result<T, Prisma.Args<T, 'deleteMany'>, 'deleteMany'>>
      },
    },
  },
})
