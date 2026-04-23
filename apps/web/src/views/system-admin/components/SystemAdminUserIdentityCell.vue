<script setup lang="ts">
import type { SystemAdminUserItem } from '@/apis/system-admin'
import CollabIdentityItem from '@/components/collab-identity/CollabIdentityItem.vue'

const props = defineProps<{
  user: SystemAdminUserItem
}>()
</script>

<template>
  <CollabIdentityItem :identity="props.user" :avatar-size="40" />
</template>
