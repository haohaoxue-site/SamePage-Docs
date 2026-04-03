import { Prisma } from '@prisma/client'

function injectDeletedAtFilter(args: Record<string, any>): void {
  args.where ??= {}
  if (!('deletedAt' in args.where)) {
    args.where.deletedAt = null
  }
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

      async delete({ model, args }) {
        return (Prisma.getExtensionContext(this) as any)[model].update({
          ...args,
          data: { deletedAt: new Date() },
        })
      },

      async deleteMany({ model, args }) {
        return (Prisma.getExtensionContext(this) as any)[model].updateMany({
          ...args,
          data: { deletedAt: new Date() },
        })
      },
    },
  },
})
