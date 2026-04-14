import type { ComputedRef, Ref } from 'vue';

export function useFoodCatalogEditorState(options?: {
  isLoading?: Readonly<Ref<boolean>> | Readonly<ComputedRef<boolean>>;
}) {
  const hasUnsavedChanges = ref(false);
  const isFormValid = ref(false);
  const isSubmitting = ref(false);

  const isLoading = computed(() => options?.isLoading?.value ?? false);
  const canSubmit = computed(
    () =>
      hasUnsavedChanges.value &&
      isFormValid.value &&
      !isLoading.value &&
      !isSubmitting.value,
  );
  const submitButtonColor = computed(() =>
    canSubmit.value ? 'primary' : 'neutral',
  );
  const submitButtonVariant = computed(() =>
    canSubmit.value ? 'solid' : 'subtle',
  );

  function onDirtyChange(value: boolean) {
    hasUnsavedChanges.value = value;
  }

  function onValidityChange(value: boolean) {
    isFormValid.value = value;
  }

  function onSubmitStateChange(value: boolean) {
    isSubmitting.value = value;
  }

  return {
    hasUnsavedChanges,
    isFormValid,
    isSubmitting,
    canSubmit,
    submitButtonColor,
    submitButtonVariant,
    onDirtyChange,
    onValidityChange,
    onSubmitStateChange,
  };
}
