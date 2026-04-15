import type { FormInstance, FormItemRule, FormRules } from 'element-plus'
import type { Ref } from 'vue'
import type { ChatModelSelection } from '@/apis/chat'

type RuleValidator = NonNullable<FormItemRule['validator']>

function resolveTrimmedValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function createRequiredValidator(message: string): RuleValidator {
  return (_rule, value, callback) => {
    if (!resolveTrimmedValue(value)) {
      callback(new Error(message))
      return
    }

    callback()
  }
}

export function useChatProviderSettingsDialog(options: {
  form: Ref<ChatModelSelection>
  providerFormRef: Ref<FormInstance | null>
  onRefreshModels: () => void
  onSave: () => void
}) {
  const formRules: FormRules<ChatModelSelection> = {
    model: [{
      validator: createRequiredValidator('请选择模型'),
    }],
  }

  function handleRefreshModels() {
    options.onRefreshModels()
  }

  async function handleSave() {
    options.form.value.model = options.form.value.model.trim()

    const isValid = options.providerFormRef.value
      ? await options.providerFormRef.value.validate().catch(() => false)
      : false

    if (!isValid) {
      return
    }

    options.onSave()
  }

  return {
    formRules,
    handleRefreshModels,
    handleSave,
  }
}
