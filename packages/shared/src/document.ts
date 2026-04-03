import { DOCUMENT_SECTION_ID_VALUES, OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE } from '@haohaoxue/samepage-contracts'

type DocumentSpaceScope = keyof typeof OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE
type DocumentSectionId = (typeof DOCUMENT_SECTION_ID_VALUES)[number]
type OwnedDocumentSectionId = (typeof OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE)[DocumentSpaceScope]

export function isDocumentSectionId(value: string): value is DocumentSectionId {
  return DOCUMENT_SECTION_ID_VALUES.includes(value as DocumentSectionId)
}

export function resolveOwnedDocumentSectionId(scope: DocumentSpaceScope): OwnedDocumentSectionId {
  return OWNED_DOCUMENT_SECTION_ID_BY_SPACE_SCOPE[scope]
}
