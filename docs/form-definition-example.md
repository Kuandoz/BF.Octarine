# A form definition, by example

A request for a group trip: who asks, through which channel, where they live, who travels and
when. It shows the design in `HANDOFF.md` (Decisions → "The form definition in three parts"),
including a shared part: the Belgian address.
Nothing here runs yet: step 5 builds it.

A definition has three parts:

- `schema` is what the data must be: JSON Schema with Octarine's own keywords.
- `localisations` holds the texts per language.
- `components` is one way to show and fill in that data.

## 1. What the system provides (once, shared by the app and the server)

```ts
// rules.ts: imported by the app (createForms) and by the form service
export const rules = {
  // Facts about where a form runs. The server sets them; the client never does.
  env: {
    schema: {
      type: 'object',
      properties: { isBackOffice: { type: 'boolean' }, language: { type: 'string' } },
    },
  },
  // Lists know their own key and the shape of their items.
  lists: [
    { name: 'countries', key: 'alpha-3', schema: countryItem },
    { name: 'provinces', key: 'code', schema: provinceItem },
    { name: 'municipalities', key: 'nis', schema: municipalityItem },
  ],
  listProvider, // getList(name, { locale }) fetches the items
  formats: { iban, insz }, // checks that look at the value alone
  validators: { ibanExists }, // named checks, `check: ['ibanExists']`; may be async
  functions: { age, sum }, // for expressions
}
```

The items a list returns. A name can be given per language:

```jsonc
// countries
{ "alpha-2": "BE", "alpha-3": "BEL", "numeric": "056",
  "name": { "nl": "België", "fr": "Belgique", "en": "Belgium" } }

// provinces
{ "code": "VOV", "name": { "nl": "Oost-Vlaanderen", "fr": "Flandre-Orientale" } }

// municipalities
{ "nis": "44021", "province": "VOV", "name": { "nl": "Gent", "fr": "Gand" } }
```

## 2. The model's schema (`trip-request.schema.json`)

The schema is a file of its own here, so another form (a read-only summary, a back-office
view) or an API can use the same model. A simple form can also keep it inline.

```jsonc
{
  "$schema": "https://octarine.dev/schema/form-model", // our dialect: standard + our keywords
  "$id": "https://example.org/schemas/trip-request.json",
  "title": "Trip request", // for the people who maintain it, not localised
  "type": "object",
  "properties": {
    // An enum: the values are written once, here.
    "registerType": {
      "enum": ["Citizen", "CitizenWithEid", "OfficialPhone", "OfficialMail", "OfficialOffice"],
      "default": "Citizen",
      // Citizens may only use their own channels; the back office may use all of them.
      "validWhen": "env.isBackOffice || registerType === 'Citizen' || registerType === 'CitizenWithEid'",
    },

    "applicant": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "maxLength": 100 },
        "email": { "type": "string", "format": "email" },
        "wantsCall": { "type": "boolean", "default": false },
        // Required only when a call is wanted. The scope is the parent object (applicant).
        "phone": { "type": "string", "format": "phone", "requiredWhen": "wantsCall === true" },
        // No `value` property, so the whole item is stored (a snapshot).
        "country": {
          "$ref": "https://example.org/schemas/country-item.json",
          "inList": { "list": "countries" },
        },
        "iban": { "type": "string", "format": "iban", "check": ["ibanExists"] },
        // A shared model of its own (section 3). It's only asked of applicants in Belgium;
        // $root reaches the whole model.
        "address": {
          "$ref": "https://example.org/schemas/be-address.json",
          "requiredWhen": "$root.applicant.country['alpha-3'] === 'BEL'",
        },
      },
      "required": ["name", "email", "country"],
    },

    "departure": { "type": "string", "format": "date", "minDate": "today+7" },
    // One field against another: an expression, with the parent (the root here) as scope.
    "return": { "type": "string", "format": "date", "validWhen": "return >= departure" },

    "travellers": {
      "type": "array",
      "minItems": 1,
      "maxItems": 9,
      "uniqueBy": "insz", // nobody travels twice
      "validWhen": "sum(travellers, 'budget') <= 5000", // a rule over all rows
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "insz": { "type": "string", "format": "insz" },
          "birthDate": { "type": "string", "format": "date", "maxDate": "today" },
          "budget": { "type": "number", "minimum": 0, "default": 0 },
          "needsAssistance": { "type": "boolean", "default": false },
          // Scoped to the row: this traveller's own checkbox.
          "assistance": {
            "type": "string",
            "maxLength": 200,
            "requiredWhen": "needsAssistance === true",
          },
        },
        "required": ["name", "insz", "birthDate"],
      },
    },

    // Always this value; the server checks it.
    "channel": { "const": "web" },
  },
  "required": ["registerType", "applicant", "departure", "return", "travellers"],
}
```

`requiredWhen` on `address` makes the whole object required. Its own `required` list (section 3) then says what it needs.

## 3. A shared part: the Belgian address

Many forms ask for an address, so it's a part: a view of a shared model, found by name
(`be-address`) through the app's loader. Its model is a schema like any other
(`be-address.schema.json`):

```jsonc
{
  "$schema": "https://octarine.dev/schema/form-model",
  "$id": "https://example.org/schemas/be-address.json",
  "title": "Belgian address",
  "type": "object",
  "properties": {
    "street": { "type": "string" },
    "postcode": { "type": "string", "pattern": "^[0-9]{4}$" },
    // Snapshots, and the municipality filtered by the chosen province.
    "province": {
      "$ref": "https://example.org/schemas/province-item.json",
      "inList": { "list": "provinces" },
    },
    "municipality": {
      "$ref": "https://example.org/schemas/municipality-item.json",
      "inList": { "list": "municipalities", "filter": "$element.province === province.code" },
    },
  },
  "required": ["street", "postcode", "province", "municipality"],
}
```

The part (`be-address.part.json`) has the same three parts as a form, plus the `props` a form
can set where it places the part:

```jsonc
{
  // The model this view shows. The part doesn't add it to the form: the form's schema says what
  // is at the path where the part is placed, and the check warns when it isn't this schema.
  "schema": { "$ref": "https://example.org/schemas/be-address.json" },

  // What a form may change, as a schema: an unknown or wrongly typed prop is a warning.
  "props": {
    "type": "object",
    "properties": {
      // A changeable text is a key. Without one, the part's own "Title".
      "title": { "type": "string", "default": "Title" },
      "showHints": { "type": "boolean", "default": true },
    },
  },

  // Scoped to the part: another part's "Title" never overwrites this one.
  "localisations": {
    "default": "nl",
    "nl": {
      "Title": "Adres",
      "Street": "Straat en nummer",
      "Postcode": "Postcode",
      "PostcodePattern": "Gelieve 4 cijfers in te vullen, zoals 9000.",
      "Province": "Provincie",
      "Municipality": "Gemeente",
      "MunicipalityHint": "Kies eerst een provincie.",
      "MunicipalityInProvince": "Deze gemeente ligt niet in de gekozen provincie.",
    },
    "fr": { "Title": "Adresse", "…": "…" },
  },

  // Paths are relative to where the part is placed: applicant.address in the trip form.
  "components": [
    {
      "type": "group",
      // A text from a prop: the key the form gave, looked up in the form's texts.
      "label": "$props.title",
      "components": [
        { "type": "text", "path": "street", "label": "Street", "autocomplete": "street-address" },
        {
          "type": "text",
          "path": "postcode",
          "label": "Postcode",
          "autocomplete": "postal-code",
          "layout": { "width": "third" },
          // Only the pattern is reworded; `required` keeps Octarine's own text.
          "errorMessages": { "pattern": "PostcodePattern" },
        },
        {
          "type": "select",
          "path": "province",
          "label": "Province",
          "options": { "label": "name", "sort": true },
          "layout": { "width": "third" },
        },
        {
          "type": "select",
          "path": "municipality",
          "label": "Municipality",
          // A conditional text, like any label or hint: shown while the prop is true.
          "hint": { "MunicipalityHint": "$props.showHints" },
          "options": { "label": "name", "sort": true },
          "layout": { "width": "third" },
          "disabled": "!province",
          // A new province clears a municipality that isn't in it.
          "clearWhenUnavailable": true,
          "errorMessages": { "inList": "MunicipalityInProvince" },
        },
      ],
    },
  ],
}
```

## 4. The form (`trip-request.form.json`)

```jsonc
{
  "schema": { "$ref": "https://example.org/schemas/trip-request.json" },

  "localisations": {
    // Shared tables, found by name like parts, come after the form's own texts, then the app's,
    // the field type's and Octarine's.
    "shared": ["common"],
    "default": "nl",
    "nl": {
      "RegisterType": {
        "Title": "Ontvangen via",
        "Options": {
          "Citizen": "Niet aangemelde individuele aanvrager",
          "CitizenWithEid": "Veilig aangemelde individuele aanvrager",
          "OfficialPhone": "Telefoon",
          "OfficialMail": "E-mail",
          "OfficialOffice": "Loket",
        },
      },
      "Applicant": {
        "Title": "Aanvrager",
        "Name": "Naam",
        "Email": "E-mail",
        "WantsCall": "Bel me terug",
        "Phone": "Telefoonnummer",
        "PhoneHint": "We bellen op werkdagen.",
        "Country": "Land",
        "Iban": "Rekeningnummer (IBAN)",
        "IbanUnknown": "Gelieve een bestaand rekeningnummer in te vullen.",
      },
      // A prop's text: this form calls it the home address.
      "HomeAddress": "Woonadres",
      // Rewording a part's own text: explicit, under the part's name.
      "be-address": { "Street": "Straat, nummer en bus" },
      "Trip": {
        "Title": "Reis",
        "Departure": "Vertrek",
        "Return": "Terugkeer",
        "ReturnAfterDeparture": "Gelieve een terugkeer op of na het vertrek te kiezen.",
      },
      "Travellers": {
        "Title": "Reizigers",
        "Item": "Reiziger {index}: {name}",
        "Min": "Gelieve minstens {min} reiziger toe te voegen.",
        "Twice": "Iedere reiziger mag maar één keer voorkomen.",
        "Budget": "Het totale budget mag hoogstens € 5.000 zijn.",
        "Name": "Volledige naam",
        "Insz": "Rijksregisternummer",
        "BirthDate": "Geboortedatum",
        "BudgetPerPerson": "Budget",
        "NeedsAssistance": "Heeft hulp nodig",
        "Assistance": "Welke hulp?",
      },
    },
    "fr": {
      "RegisterType": { "Title": "Demande reçue via", "Options": { "…": "…" } },
      "…": "…",
    },
  },

  "components": [
    {
      "type": "select",
      "path": "registerType",
      "label": "RegisterType.Title",
      // Values from the model's enum, texts from this table.
      "options": { "labels": "RegisterType.Options" },
      // Only the back office chooses. A citizen's form hides it, and the model's `default`
      // fills it in, so the field is never required while hidden and empty.
      "hide": "!env.isBackOffice",
    },

    {
      "type": "group",
      "path": "applicant",
      "label": "Applicant.Title",
      "components": [
        // Paths are relative: this is applicant.name.
        {
          "type": "text",
          "path": "name",
          "label": "Applicant.Name",
          "autocomplete": "name",
          "layout": { "width": "half" },
        },
        // `format: email` in the model gives the email keyboard; nothing to say here.
        {
          "type": "text",
          "path": "email",
          "label": "Applicant.Email",
          "autocomplete": "email",
          "layout": { "width": "half" },
        },
        { "type": "checkbox", "path": "wantsCall", "label": "Applicant.WantsCall" },
        {
          "type": "text",
          "path": "phone",
          "label": "Applicant.Phone",
          "hint": "Applicant.PhoneHint",
          "autocomplete": "tel",
          // Also relative: applicant.wantsCall. The model's requiredWhen says the same, on purpose:
          // the check warns when a field can be hidden while it's still required.
          "hide": "wantsCall !== true",
          "clearWhenHidden": true,
        },
        {
          "type": "select",
          "path": "country",
          "label": "Applicant.Country",
          // Values from the model's inList, the label from each item, in the current language.
          "options": { "label": "name", "sort": true },
        },
        {
          "type": "text",
          "path": "iban",
          "label": "Applicant.Iban",
          "errorMessages": { "check": "Applicant.IbanUnknown" },
        },

        // The part, placed at applicant.address. A placement takes the options of a group for
        // the part as a whole (`hide` here), and the props the part declares.
        {
          "part": "be-address",
          "path": "address",
          "hide": "country['alpha-3'] !== 'BEL'",
          "props": { "title": "HomeAddress", "showHints": false },
        },
      ],
    },

    // A group without a path is only visual: departure is still at the root.
    {
      "type": "group",
      "label": "Trip.Title",
      "components": [
        {
          "type": "date",
          "path": "departure",
          "label": "Trip.Departure",
          "layout": { "width": "half" },
        },
        {
          "type": "date",
          "path": "return",
          "label": "Trip.Return",
          "layout": { "width": "half" },
          // validWhen's own text is generic, so the check warns without this.
          "errorMessages": { "validWhen": "Trip.ReturnAfterDeparture" },
        },
      ],
    },

    {
      "type": "repeat",
      "path": "travellers",
      "label": "Travellers.Title",
      "itemLabel": "Travellers.Item",
      "errorMessages": {
        "minItems": "Travellers.Min",
        "uniqueBy": "Travellers.Twice",
        "validWhen": "Travellers.Budget",
      },
      "components": [
        // Relative to the row: travellers.<row>.name.
        {
          "type": "text",
          "path": "name",
          "label": "Travellers.Name",
          "layout": { "width": "half" },
        },
        {
          "type": "text",
          "path": "insz",
          "label": "Travellers.Insz",
          "layout": { "width": "half" },
        },
        {
          "type": "date",
          "path": "birthDate",
          "label": "Travellers.BirthDate",
          "layout": { "width": "half" },
        },
        {
          "type": "number",
          "path": "budget",
          "label": "Travellers.BudgetPerPerson",
          "layout": { "width": "half" },
        },
        { "type": "checkbox", "path": "needsAssistance", "label": "Travellers.NeedsAssistance" },
        {
          "type": "textarea",
          "path": "assistance",
          "label": "Travellers.Assistance",
          "hide": "needsAssistance !== true",
        },
      ],
    },
  ],
}
```

What isn't there, because the model says it:

- **No `required` on a component.** The marker comes from `required` and `requiredWhen`.
- **No `maxLength`, `pattern` or `inputType`.** The counter, the keyboard and the date picker come
  from the schema.
- **No list of options.** The enum and the lists give the values.
- **No `validations`, `defaults`, `constants` or `lists`.** They're all in the schema now.
- **No literal text.** Every label, hint and message is a key of `localisations`.
- **No address fields.** The part brings them, with their texts. `"title": "HomeAddress"` rather
  than rewording the part's "Title": a form with a home and a work address places the part twice,
  and each placement gets its own title.

## 5. The model that is sent

```jsonc
{
  "registerType": "CitizenWithEid",
  "applicant": {
    "name": "Jan Peeters",
    "email": "jan@example.org",
    "wantsCall": false, // phone was cleared while hidden
    "country": {
      "alpha-2": "BE",
      "alpha-3": "BEL",
      "numeric": "056",
      "name": { "nl": "België", "fr": "Belgique", "en": "Belgium" },
    },
    "iban": "BE68539007547034",
    "address": {
      "street": "Veldstraat 1",
      "postcode": "9000",
      "province": { "code": "VOV", "name": { "nl": "Oost-Vlaanderen", "fr": "Flandre-Orientale" } },
      "municipality": { "nis": "44021", "province": "VOV", "name": { "nl": "Gent", "fr": "Gand" } },
    },
  },
  "departure": "2026-11-15",
  "return": "2026-11-22",
  "travellers": [
    {
      "name": "Jan Peeters",
      "insz": "85073003328",
      "birthDate": "1985-07-30",
      "budget": 1200,
      "needsAssistance": false,
    },
  ],
  "channel": "web",
}
```

The snapshots (country, province, municipality) travel with the model. A read-only view of this
submission shows "België" and "Gent" without the lists, even after the lists change. A new version
of the submission must match the current lists again.

## 6. What the server does with it

It checks the model with the schema alone. Neither the form nor the part is needed, so an API
call with the same model gets the same check:

- `registerType: "OfficialPhone"` from a citizen, so with `env.isBackOffice` false, fails
  `validWhen`.
- A snapshot that differs from the current list item with the same key fails `inList`.
- `channel: "api"` fails `const`.

The errors are keys with parameters. The client turns them into text with the form's
`errorMessages`, or the server does with `translateErrors`:

```ts
{ path: 'travellers', keyword: 'minItems', key: 'validation.minItems', params: { min: 1 } }
// → "Reizigers: Gelieve minstens 1 reiziger toe te voegen."
```
