<template>
  <view-container :is-auth-page="true">
    <view-title title="Reset Password" />

    <form @submit.prevent="handleSubmit">
      <div class="mb-2">
        <label for="currentPassword">Current Password</label>
        <input type="password" required name="currentPassword" class="form-control" v-model="currentPassword"
          :disabled="isLoading">
      </div>

      <div class="mb-2">
        <label for="newPassword">New Password</label>
        <input type="password" required name="newPassword" class="form-control" v-model="newPassword"
          :disabled="isLoading">
      </div>

      <div class="mb-2">
        <label for="newPasswordConfirm">Confirm New Password</label>
        <input type="password" required name="newPasswordConfirm" class="form-control"
          v-model="newPasswordConfirm" :disabled="isLoading">
      </div>

      <form-error-list v-bind:errors="errors" />

      <div>
        <button type="submit" class="btn btn-success" :disabled="isLoading">Change Password</button>
        <router-link to="/account/settings" tag="button" class="btn btn-danger float-end">Cancel</router-link>
      </div>
    </form>

    <loading-spinner :loading="isLoading" />
  </view-container>
</template>

<script setup lang="ts">
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ViewContainer from '../components/ViewContainer.vue'
import router from '../../router'
import ViewTitle from '../components/ViewTitle.vue'
import FormErrorList from '../components/FormErrorList.vue'
import { ref, inject, type Ref } from 'vue'
import { extractErrors, formatError, httpInjectionKey, isOk } from '@/services/typedapi'
import { updatePassword } from '@/services/typedapi/user'
import {toastInjectionKey} from "@/util/keys";

const httpClient = inject(httpInjectionKey)!;
const toast = inject(toastInjectionKey)!;

const isLoading = ref(false);
const errors: Ref<string[]> = ref([]);
const currentPassword = ref('');
const newPassword = ref('');
const newPasswordConfirm = ref('');

const handleSubmit = async (e: Event) => {
  e.preventDefault();

  if (!currentPassword.value) {
    errors.value.push('Current password required.');
  }

  if (!newPassword.value) {
    errors.value.push('New password required.');
  }

  if (!newPasswordConfirm.value) {
    errors.value.push('New password confirmation required.');
  }

  if (newPassword.value !== newPasswordConfirm.value) {
    errors.value.push('Passwords must match.');
  }

  if (errors.value.length) {
    return;
  }

  isLoading.value = true;

  const response = await updatePassword(httpClient)(currentPassword.value, newPassword.value);

  if (isOk(response)) {
    toast.success(`Password updated.`);
    router.push({ name: 'account-settings' });
  } else {
    console.error(formatError(response));
    errors.value = extractErrors(response);
    toast.error(`There was a problem updating your password, please try again.`);
  }

  isLoading.value = false;

}
</script>

<style scoped></style>
