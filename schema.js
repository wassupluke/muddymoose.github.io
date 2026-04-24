// JSON Schema for content.yaml. Enforced by build.js via Ajv.
// Keep this file in sync with the shape expected by the Handlebars templates.

const hex6 = { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" };
const isoDate = { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };

module.exports = {
  type: "object",
  required: ["site", "theme", "pickup", "menu", "payment", "form"],
  additionalProperties: false,
  properties: {
    site: {
      type: "object",
      required: ["title", "heading_primary", "heading_accent"],
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 1 },
        tagline: { type: "string" },
        heading_primary: { type: "string", minLength: 1 },
        heading_accent: { type: "string", minLength: 1 },
        header_note: { type: "string" },
        footer: { type: "string" },
        advance_hours: { type: "integer", minimum: 0 },
        success_heading: { type: "string" },
        success_message: { type: "string" },
      },
    },
    theme: {
      type: "object",
      required: ["light"],
      additionalProperties: false,
      properties: {
        light: {
          type: "object",
          required: [
            "fire", "ember", "cream", "slate", "forest",
            "bark", "wheat", "smoke", "surface_dark",
          ],
          additionalProperties: false,
          properties: {
            fire: hex6, ember: hex6, cream: hex6, slate: hex6,
            forest: hex6, bark: hex6, wheat: hex6, smoke: hex6,
            surface_dark: hex6,
          },
        },
        dark: {
          type: "object",
          additionalProperties: hex6,
          properties: {
            fire: hex6, ember: hex6, cream: hex6, slate: hex6,
            forest: hex6, bark: hex6, wheat: hex6, smoke: hex6,
            surface_dark: hex6,
          },
        },
      },
    },
    pickup: {
      type: "object",
      required: ["bake_day", "weeks_ahead", "time_slots"],
      additionalProperties: false,
      properties: {
        bake_day: {
          enum: [
            "Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday",
          ],
        },
        weeks_ahead: { type: "integer", minimum: 1, maximum: 52 },
        min_lead_time_days: { type: "integer", minimum: 0 },
        note: { type: "string" },
        time_slots: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["day_offset", "label"],
            additionalProperties: false,
            properties: {
              day_offset: { type: "integer", minimum: 0, maximum: 6 },
              label: { type: "string", minLength: 1 },
            },
          },
        },
      },
    },
    menu: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "icon", "name", "description", "price_display"],
        additionalProperties: false,
        oneOf: [
          {
            required: ["price", "unit_label"],
            not: { required: ["sizes"] },
          },
          {
            required: ["sizes"],
            not: { anyOf: [{ required: ["price"] }, { required: ["unit_label"] }] },
          },
        ],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9_-]*$" },
          icon: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          description: { type: "string" },
          price: { type: "number", minimum: 0 },
          unit_label: { type: "string" },
          price_display: { type: "string" },
          sizes: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["label", "price"],
              additionalProperties: false,
              properties: {
                label: { type: "string", minLength: 1 },
                price: { type: "number", minimum: 0 },
              },
            },
          },
        },
      },
    },
    special_event: {
      type: "object",
      required: ["enabled"],
      additionalProperties: false,
      if: { properties: { enabled: { const: true } } },
      then: {
        required: [
          "title", "icon",
          "banner_from", "banner_to", "banner_accent",
          "button_bg", "button_text",
          "deadline", "pickup_label", "pickup_days", "boxes",
        ],
      },
      properties: {
        enabled: { type: "boolean" },
        title: { type: "string" },
        subtitle: { type: "string" },
        icon: { type: "string" },
        banner_from: hex6,
        banner_to: hex6,
        banner_accent: hex6,
        button_bg: hex6,
        button_text: hex6,
        deadline: isoDate,
        pickup_label: { type: "string" },
        pickup_days: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["date", "label"],
            additionalProperties: false,
            properties: {
              date: isoDate,
              label: { type: "string", minLength: 1 },
            },
          },
        },
        boxes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["name", "serves", "price", "items"],
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1 },
              serves: { type: "string" },
              price: { type: "number", minimum: 0 },
              featured: { type: "boolean" },
              items: {
                type: "array",
                minItems: 1,
                items: { type: "string", minLength: 1 },
              },
            },
          },
        },
      },
    },
    payment: {
      type: "object",
      required: ["venmo", "zelle"],
      additionalProperties: false,
      properties: {
        venmo: {
          type: "object",
          required: ["handle", "qr_image", "qr_link"],
          additionalProperties: false,
          properties: {
            handle: { type: "string", minLength: 1 },
            qr_image: { type: "string", minLength: 1 },
            qr_link: { type: "string", format: "uri" },
          },
        },
        zelle: {
          type: "object",
          required: ["email", "qr_image", "qr_link"],
          additionalProperties: false,
          properties: {
            email: { type: "string", format: "email" },
            qr_image: { type: "string", minLength: 1 },
            qr_link: { type: "string", format: "uri" },
          },
        },
      },
    },
    form: {
      type: "object",
      required: ["formspree_id"],
      additionalProperties: false,
      properties: {
        formspree_id: { type: "string", minLength: 1 },
      },
    },
  },
};
