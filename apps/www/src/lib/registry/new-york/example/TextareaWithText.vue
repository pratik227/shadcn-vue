<script setup lang="ts">
import { Textarea } from '@/lib/registry/new-york/ui/textarea'
import { Label } from '@/lib/registry/new-york/ui/label'
</script>

<template>
  <div class="grid w-full gap-1.5">
    <Label for="message-2">Your message</Label>
    <Textarea id="message-2" placeholder="Type your message here." />
    <p className="text-sm text-muted-foreground">
      Your message will be copied to the support team.
    </p>
  </div>
</template>
