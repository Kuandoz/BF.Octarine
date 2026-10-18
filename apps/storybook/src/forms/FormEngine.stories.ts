import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { contactForm, travellersForm } from './form-engine/definitions'
import FormEngineDemo from './form-engine/FormEngineDemo.vue'

/**
 * `@octarine/form-engine` rendering JSON form definitions with Octarine's
 * components. Labels follow the toolbar's language; the engine's own
 * validation messages are English for now.
 */
const meta = {
  title: 'Forms/Form engine',
  // FormEngine.mdx is its docs page.
  tags: ['!autodocs'],
  component: FormEngineDemo,
  args: { definition: contactForm(), label: 'Contact us' },
  argTypes: {
    definition: { control: 'object' },
    model: { control: 'object' },
    // The stories follow the toolbar's language through <html lang>.
    locale: { control: false },
  },
} satisfies Meta<typeof FormEngineDemo>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Send it empty: the summary takes focus and links to each field. Check "Call me
 * back" and the phone number appears, required only while it is shown. Errors
 * show once a field is left, and follow the value from then on.
 */
export const Contact: Story = {}

/** The same form opened with values, as when editing what was sent before. */
export const Prefilled: Story = {
  args: {
    model: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      wantsCall: true,
      phone: '+32 470 12 34 56',
      address: { street: 'Analytical Street 1', postcode: '9000', city: 'Gent' },
    },
  },
}

/**
 * A list of travellers. "Needs assistance" shows a field in that row only.
 * Sending an empty list links the error to the Add button.
 */
export const Repeat: Story = {
  args: {
    definition: travellersForm(),
    label: 'Travellers',
    model: { travellers: [{ name: '', birthDate: '' }] },
  },
}

/**
 * Two forms on one page with the same paths keep everything apart: values,
 * errors, ids and summary links.
 */
export const TwoForms: Story = {
  render: () => ({
    components: { FormEngineDemo },
    setup: () => ({ contactForm }),
    template: `
      <div class="grid gap-10 md:grid-cols-2">
        <section aria-labelledby="first-heading" class="flex flex-col gap-4">
          <h2 id="first-heading" class="text-heading-3">First contact</h2>
          <FormEngineDemo :definition="contactForm()" label="First contact" />
        </section>
        <section aria-labelledby="second-heading" class="flex flex-col gap-4">
          <h2 id="second-heading" class="text-heading-3">Second contact</h2>
          <FormEngineDemo :definition="contactForm()" label="Second contact" />
        </section>
      </div>
    `,
  }),
}
