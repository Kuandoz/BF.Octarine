import type { FormDefinition } from '../../../../../packages/form-engine/src'

/** Conditions, a required-if, a group, half and third widths, and labels in four languages. */
export const contactForm = (): FormDefinition => ({
  components: [
    { type: 'text', path: 'name', label: 'name', autocomplete: 'name', layout: { width: 'half' } },
    {
      type: 'text',
      path: 'email',
      label: 'email',
      inputType: 'email',
      autocomplete: 'email',
      layout: { width: 'half' },
    },
    { type: 'checkbox', path: 'wantsCall', label: 'wantsCall' },
    {
      type: 'text',
      path: 'phone',
      label: 'phone',
      hint: 'phoneHint',
      inputType: 'tel',
      autocomplete: 'tel',
      hide: 'wantsCall !== true',
    },
    {
      type: 'group',
      path: 'address',
      label: 'address',
      hint: 'addressHint',
      components: [
        { type: 'text', path: 'address.street', label: 'street', autocomplete: 'street-address' },
        {
          type: 'text',
          path: 'address.postcode',
          label: 'postcode',
          autocomplete: 'postal-code',
          layout: { width: 'third' },
        },
        {
          type: 'text',
          path: 'address.city',
          label: 'city',
          autocomplete: 'address-level2',
          layout: { width: 'third' },
        },
      ],
    },
    { type: 'text', path: 'message', label: 'message', maxLength: 140 },
  ],
  validations: {
    name: [{ type: 'required' }],
    email: [{ type: 'required' }, { type: 'email' }],
    // Asked for only while the field is shown: hide paired with a required-if.
    phone: [{ type: 'required', condition: 'wantsCall === true' }, { type: 'phone' }],
    'address.postcode': [{ type: 'numeric' }, { type: 'maxLength', value: 4 }],
    message: [{ type: 'maxLength', value: 140 }],
  },
  localisations: {
    default: 'en',
    en: {
      name: 'Name',
      email: 'Email',
      wantsCall: 'Call me back',
      phone: 'Phone number',
      phoneHint: 'We call on working days.',
      address: 'Address',
      addressHint: 'Optional. For sending you a brochure.',
      street: 'Street and number',
      postcode: 'Postcode',
      city: 'City',
      message: 'Message',
    },
    nl: {
      name: 'Naam',
      email: 'E-mail',
      wantsCall: 'Bel me terug',
      phone: 'Telefoonnummer',
      phoneHint: 'We bellen op werkdagen.',
      address: 'Adres',
      addressHint: 'Niet verplicht. Om u een brochure te sturen.',
      street: 'Straat en nummer',
      postcode: 'Postcode',
      city: 'Gemeente',
      message: 'Bericht',
    },
    fr: {
      name: 'Nom',
      email: 'E-mail',
      wantsCall: 'Rappelez-moi',
      phone: 'Numéro de téléphone',
      phoneHint: 'Nous appelons les jours ouvrables.',
      address: 'Adresse',
      addressHint: 'Facultatif. Pour vous envoyer une brochure.',
      street: 'Rue et numéro',
      postcode: 'Code postal',
      city: 'Commune',
      message: 'Message',
    },
    de: {
      name: 'Name',
      email: 'E-Mail',
      wantsCall: 'Rückruf erwünscht',
      phone: 'Telefonnummer',
      phoneHint: 'Wir rufen an Werktagen an.',
      address: 'Adresse',
      addressHint: 'Optional. Für den Versand einer Broschüre.',
      street: 'Straße und Hausnummer',
      postcode: 'Postleitzahl',
      city: 'Ort',
      message: 'Nachricht',
    },
  },
})

/** A list of rows, a condition scoped to each row, and a rule on the list itself. */
export const travellersForm = (): FormDefinition => ({
  components: [
    {
      type: 'repeat',
      path: 'travellers',
      label: 'Travellers',
      hint: 'Add everyone who travels, at least one.',
      itemLabel: 'Traveller',
      components: [
        { type: 'text', path: 'name', label: 'Full name', layout: { width: 'half' } },
        {
          type: 'text',
          path: 'birthDate',
          label: 'Date of birth',
          inputType: 'date',
          layout: { width: 'half' },
        },
        { type: 'checkbox', path: 'needsAssistance', label: 'Needs assistance' },
        {
          type: 'text',
          path: 'assistance',
          label: 'What kind of assistance?',
          // Scoped to the row: this traveller's own checkbox.
          hide: 'needsAssistance !== true',
        },
      ],
    },
  ],
  validations: {
    // An empty list counts as empty, so `required` means "at least one".
    travellers: [{ type: 'required', message: 'Add at least one traveller.' }],
    'travellers.*.name': [{ type: 'required' }],
    'travellers.*.birthDate': [{ type: 'required' }],
    'travellers.*.assistance': [{ type: 'required', condition: 'needsAssistance === true' }],
  },
})
