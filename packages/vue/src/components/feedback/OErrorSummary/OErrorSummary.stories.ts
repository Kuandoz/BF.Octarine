import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import OButton from '../../actions/OButton/OButton.vue'
import OField from '../../forms/OField/OField.vue'
import OForm from '../../forms/OForm/OForm.vue'
import OInput from '../../forms/OInput/OInput.vue'
import OErrorSummary from './OErrorSummary.vue'

/**
 * Lists a form's errors after a failed submit, at the top of the form. It takes
 * focus when it appears, and each link moves focus to its field (WCAG 3.3.1).
 */
const meta = {
  title: 'Feedback/ErrorSummary',
  component: OErrorSummary,
  args: {
    autofocus: false,
    errors: [
      { message: 'Enter your name', target: 'summary-name' },
      { message: 'Enter an email address like name@example.com', target: 'summary-email' },
    ],
  },
} satisfies Meta<typeof OErrorSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Submit the empty form: the summary appears, takes focus and links to each field. */
export const InAForm: Story = {
  render: () => ({
    components: { OButton, OErrorSummary, OField, OForm, OInput },
    setup() {
      const name = ref('')
      const email = ref('')
      const attempts = ref(0)
      const errors = computed(() =>
        attempts.value === 0
          ? []
          : [
              !name.value && { message: 'Enter your name', target: 'form-name' },
              !email.value.includes('@') && {
                message: 'Enter an email address like name@example.com',
                target: 'form-email',
              },
            ].filter((error) => error !== false),
      )
      const errorFor = (target: string) => errors.value.find((e) => e.target === target)?.message
      return { name, email, attempts, errors, errorFor }
    },
    template: `
      <OForm class="max-w-sm" novalidate @submit.prevent="attempts++">
        <OErrorSummary v-if="errors.length" :key="attempts" :errors="errors" />
        <OField id="form-name" label="Name" required :error="errorFor('form-name')">
          <OInput v-model="name" autocomplete="name" />
        </OField>
        <OField id="form-email" label="Email" required :error="errorFor('form-email')">
          <OInput v-model="email" type="email" autocomplete="email" />
        </OField>
        <OButton type="submit" class="self-start">Send</OButton>
      </OForm>
    `,
  }),
}
