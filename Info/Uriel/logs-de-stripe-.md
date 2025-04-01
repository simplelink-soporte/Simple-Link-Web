Pago exitoso:

POST /v1/payment_intents 
200 OK
Inspeccionar detalles del registro en Workbench
Solicitar parámetros
{
  "amount": "6500",
  "capture_method": "automatic",
  "confirm": "true",
  "confirmation_method": "automatic",
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Pago completo - Turno en Pista 3",
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "description": "Pago completo - Turno en Pista 3",
    "empresa_id": "99f78081-24fa-4892-aae2-823816e7d132",
    "empresa_stripe_id": "acct_1QddDLC4oQv4vCtF",
    "invoice_auto_generate": "true",
    "payment_type": "booking",
    "request_id": "spue5o4wxabv9k77ha0mx5h4"
  },
  "off_session": "false",
  "payment_method": "pm_1Qy2jKC4oQv4vCtFbLHgXCs5",
  "payment_method_types": {
    "0": "card"
  }
}

Ocultar líneas
Cuerpo de la respuesta
{
  "id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
  "object": "payment_intent",
  "amount": 6500,
  "capture_method": "automatic",
  "confirmation_method": "automatic",
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Pago completo - Turno en Pista 3",
  "last_payment_error": null,
  "livemode": false,
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "description": "Pago completo - Turno en Pista 3",
    "empresa_id": "99f78081-24fa-4892-aae2-823816e7d132",
    "empresa_stripe_id": "acct_1QddDLC4oQv4vCtF",
    "invoice_auto_generate": "true",
    "payment_type": "booking",
    "request_id": "spue5o4wxabv9k77ha0mx5h4"
  },
  "next_action": null,
  "payment_method": "pm_1Qy2jKC4oQv4vCtFbLHgXCs5",
  "payment_method_types": [
    "card"
  ],
  "status": "succeeded",
  "amount_capturable": 0,
  "amount_details": {
    "tip": {
    }
  },
  "amount_received": 6500,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "automatic_payment_methods": null,
  "canceled_at": null,
  "cancellation_reason": null,
  "client_secret": "pi_3R**********************_******_*********************I0iU",
  "created": 1743397972,
  "invoice": null,
  "latest_charge": "ch_3R8aeWC4oQv4vCtF1eJDEt9W",
  "on_behalf_of": null,
  "payment_method_configuration_details": null,
  "payment_method_options": {
    "card": {
      "installments": null,
      "mandate_options": null,
      "network": null,
      "request_three_d_secure": "automatic"
    }
  },
  "processing": null,
  "receipt_email": null,
  "review": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}


payment_intent.created
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
  "object": "payment_intent",
  "last_payment_error": null,
  "livemode": false,
  "next_action": null,
  "status": "requires_payment_method",
  "amount": 6500,
  "amount_capturable": 0,
  "amount_details": {
    "tip": {
    }
  },
  "amount_received": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "automatic_payment_methods": null,
  "canceled_at": null,
  "cancellation_reason": null,
  "capture_method": "automatic",
  "client_secret": "pi_3R8aeWC4oQv4vCtF1Us9y78Z_secret_5xzgBuQW8CxuOL80lriKTI0iU",
  "confirmation_method": "automatic",
  "created": 1743397972,
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Pago completo - Turno en Pista 3",
  "invoice": null,
  "latest_charge": null,
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "description": "Pago completo - Turno en Pista 3",
    "empresa_id": "99f78081-24fa-4892-aae2-823816e7d132",
    "empresa_stripe_id": "acct_1QddDLC4oQv4vCtF",
    "invoice_auto_generate": "true",
    "payment_type": "booking",
    "request_id": "spue5o4wxabv9k77ha0mx5h4"
  },
  "on_behalf_of": null,
  "payment_method": null,
  "payment_method_configuration_details": null,
  "payment_method_options": {
    "card": {
      "installments": null,
      "mandate_options": null,
      "network": null,
      "request_three_d_secure": "automatic"
    }
  },
  "payment_method_types": [
    "card"
  ],
  "processing": null,
  "receipt_email": null,
  "review": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}


charge.succeeded
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "ch_3R8aeWC4oQv4vCtF1eJDEt9W",
  "object": "charge",
  "livemode": false,
  "payment_intent": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
  "status": "succeeded",
  "amount": 6500,
  "amount_captured": 6500,
  "amount_refunded": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee": null,
  "application_fee_amount": null,
  "balance_transaction": "txn_3R8aeWC4oQv4vCtF12vmKsRZ",
  "billing_details": {
    "address": {
      "city": null,
      "country": null,
      "line1": null,
      "line2": null,
      "postal_code": "15151",
      "state": null
    },
    "email": null,
    "name": null,
    "phone": null
  },
  "calculated_statement_descriptor": "PADELZONE.COM",
  "captured": true,
  "created": 1743397972,
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Pago completo - Turno en Pista 3",
  "destination": null,
  "dispute": null,
  "disputed": false,
  "failure_balance_transaction": null,
  "failure_code": null,
  "failure_message": null,
  "fraud_details": {
  },
  "invoice": null,
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "description": "Pago completo - Turno en Pista 3",
    "empresa_id": "99f78081-24fa-4892-aae2-823816e7d132",
    "empresa_stripe_id": "acct_1QddDLC4oQv4vCtF",
    "invoice_auto_generate": "true",
    "payment_type": "booking",
    "request_id": "spue5o4wxabv9k77ha0mx5h4"
  },
  "on_behalf_of": null,
  "order": null,
  "outcome": {
    "advice_code": null,
    "network_advice_code": null,
    "network_decline_code": null,
    "network_status": "approved_by_network",
    "reason": null,
    "risk_level": "normal",
    "risk_score": 24,
    "seller_message": "Payment complete.",
    "type": "authorized"
  },
  "paid": true,
  "payment_method": "pm_1Qy2jKC4oQv4vCtFbLHgXCs5",
  "payment_method_details": {
    "card": {
      "amount_authorized": 6500,
      "authorization_code": null,
      "brand": "mastercard",
      "checks": {
        "address_line1_check": null,
        "address_postal_code_check": "pass",
        "cvc_check": null
      },
      "country": "US",
      "exp_month": 5,
      "exp_year": 2032,
      "extended_authorization": {
        "status": "disabled"
      },
      "fingerprint": "LwGDCTwg7Xd74849",
      "funding": "credit",
      "incremental_authorization": {
        "status": "unavailable"
      },
      "installments": null,
      "last4": "4444",
      "mandate": null,
      "multicapture": {
        "status": "unavailable"
      },
      "network": "mastercard",
      "network_token": {
        "used": false
      },
      "network_transaction_id": "MCCLWGDCT0331",
      "overcapture": {
        "maximum_amount_capturable": 6500,
        "status": "unavailable"
      },
      "regulated_status": "unregulated",
      "three_d_secure": null,
      "wallet": null
    },
    "type": "card"
  },
  "radar_options": {
  },
  "receipt_email": null,
  "receipt_number": null,
  "receipt_url": "https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUWRkRExDNG9RdjR2Q3RGKNTIqL8GMgaOxiVPFJk6LBZjT3vWY0kgR7FkvbpMDSRPxx6TGjFijbCHi2EBJyXtmSVsidMmQ5QZUxlJ",
  "refunded": false,
  "review": null,
  "shipping": null,
  "source": null,
  "source_transfer": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}


payment_intent.succeeded
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
  "object": "payment_intent",
  "last_payment_error": null,
  "livemode": false,
  "next_action": null,
  "status": "succeeded",
  "amount": 6500,
  "amount_capturable": 0,
  "amount_details": {
    "tip": {
    }
  },
  "amount_received": 6500,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "automatic_payment_methods": null,
  "canceled_at": null,
  "cancellation_reason": null,
  "capture_method": "automatic",
  "client_secret": "pi_3R8aeWC4oQv4vCtF1Us9y78Z_secret_5xzgBuQW8CxuOL80lriKTI0iU",
  "confirmation_method": "automatic",
  "created": 1743397972,
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Pago completo - Turno en Pista 3",
  "invoice": null,
  "latest_charge": "ch_3R8aeWC4oQv4vCtF1eJDEt9W",
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "description": "Pago completo - Turno en Pista 3",
    "empresa_id": "99f78081-24fa-4892-aae2-823816e7d132",
    "empresa_stripe_id": "acct_1QddDLC4oQv4vCtF",
    "invoice_auto_generate": "true",
    "payment_type": "booking",
    "request_id": "spue5o4wxabv9k77ha0mx5h4"
  },
  "on_behalf_of": null,
  "payment_method": "pm_1Qy2jKC4oQv4vCtFbLHgXCs5",
  "payment_method_configuration_details": null,
  "payment_method_options": {
    "card": {
      "installments": null,
      "mandate_options": null,
      "network": null,
      "request_three_d_secure": "automatic"
    }
  },
  "payment_method_types": [
    "card"
  ],
  "processing": null,
  "receipt_email": null,
  "review": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}


Pago cancelado:


POST /v1/invoices/in_1R8aeXC4oQv4vCtFNXBQzP5g/finalize 
200 OK
Inspeccionar detalles del registro en Workbench
Solicitar parámetros
No hay parámetros de solicitud.
Cuerpo de la respuesta
{
  "id": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
  "object": "invoice",
  "livemode": false,
  "payment_intent": "pi_3R8aeYC4oQv4vCtF0MCMguCg",
  "status": "open",
  "account_country": "US",
  "account_name": "Pepe Caranta",
  "account_tax_ids": null,
  "amount_due": 6500,
  "amount_overpaid": 0,
  "amount_paid": 0,
  "amount_remaining": 6500,
  "amount_shipping": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "attempt_count": 0,
  "attempted": false,
  "auto_advance": false,
  "automatic_tax": {
    "disabled_reason": null,
    "enabled": false,
    "liability": null,
    "status": null
  },
  "automatically_finalizes_at": null,
  "billing_reason": "manual",
  "charge": null,
  "collection_method": "send_invoice",
  "created": 1743397973,
  "currency": "eur",
  "custom_fields": [
    {
      "name": "Referencia de Pago",
      "value": "pi_3R8aeWC4oQv4vCtF1Us9y78Z"
    }
  ],
  "customer": "cus_Rn8J5Wbe3ag16g",
  "customer_address": null,
  "customer_email": "urieltac11@gmail.com",
  "customer_name": null,
  "customer_phone": null,
  "customer_shipping": null,
  "customer_tax_exempt": "none",
  "customer_tax_ids": [
  ],
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [
  ],
  "description": "Factura: Pago completo - Turno en Pista 3",
  "discount": null,
  "discounts": [
  ],
  "due_date": 1743465599,
  "effective_at": 1743397974,
  "ending_balance": 0,
  "footer": null,
  "from_invoice": null,
  "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NA0200AkNVViTr?s=ap",
  "invoice_pdf": "https://pay.stripe.com/invoice/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NA0200AkNVViTr/pdf?s=ap",
  "issuer": {
    "type": "self"
  },
  "last_finalization_error": null,
  "latest_revision": null,
  "lines": {
    "object": "list",
    "data": [
      {
        "id": "il_1R8aeXC4oQv4vCtFYMRXYlZt",
        "object": "line_item",
        "amount": 6500,
        "amount_excluding_tax": 6500,
        "currency": "eur",
        "description": "Pago completo - Turno en Pista 3",
        "discount_amounts": [
        ],
        "discountable": true,
        "discounts": [
        ],
        "invoice": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
        "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
        "livemode": false,
        "metadata": {
        },
        "parent": {
          "invoice_item_details": {
            "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
            "proration": false,
            "proration_details": {
              "credited_items": null
            },
            "subscription": null
          },
          "subscription_item_details": null,
          "type": "invoice_item_details"
        },
        "period": {
          "end": 1743397973,
          "start": 1743397973
        },
        "plan": null,
        "pretax_credit_amounts": [
        ],
        "price": {
          "id": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
          "object": "price",
          "active": false,
          "billing_scheme": "per_unit",
          "created": 1743397973,
          "currency": "eur",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {
          },
          "nickname": null,
          "product": "prod_S2g0bvg33Bw8y6",
          "recurring": null,
          "tax_behavior": "unspecified",
          "tiers_mode": null,
          "transform_quantity": null,
          "type": "one_time",
          "unit_amount": 6500,
          "unit_amount_decimal": "6500"
        },
        "pricing": {
          "price_details": {
            "price": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
            "product": "prod_S2g0bvg33Bw8y6"
          },
          "type": "price_details",
          "unit_amount_decimal": "6500"
        },
        "proration": false,
        "proration_details": {
          "credited_items": null
        },
        "quantity": 1,
        "subscription": null,
        "tax_amounts": [
        ],
        "tax_rates": [
        ],
        "taxes": [
        ],
        "type": "invoiceitem",
        "unit_amount_excluding_tax": "6500"
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/invoices/in_1R8aeXC4oQv4vCtFNXBQzP5g/lines"
  },
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "payment_intent_id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
    "payment_type": "booking"
  },
  "next_payment_attempt": null,
  "number": "88669574-0001",
  "on_behalf_of": null,
  "paid": false,
  "paid_out_of_band": false,
  "parent": null,
  "payment_settings": {
    "default_mandate": null,
    "payment_method_options": null,
    "payment_method_types": null
  },
  "period_end": 1743397973,
  "period_start": 1743397973,
  "post_payment_credit_notes_amount": 0,
  "pre_payment_credit_notes_amount": 0,
  "quote": null,
  "receipt_number": null,
  "rendering": {
    "amount_tax_display": null,
    "pdf": {
      "page_size": "letter"
    },
    "template": null,
    "template_version": null
  },
  "shipping_cost": null,
  "shipping_details": null,
  "starting_balance": 0,
  "statement_descriptor": null,
  "status_transitions": {
    "finalized_at": 1743397974,
    "marked_uncollectible_at": null,
    "paid_at": null,
    "voided_at": null
  },
  "subscription": null,
  "subscription_details": {
    "metadata": null
  },
  "subtotal": 6500,
  "subtotal_excluding_tax": 6500,
  "tax": null,
  "test_clock": null,
  "total": 6500,
  "total_discount_amounts": [
  ],
  "total_excluding_tax": 6500,
  "total_pretax_credit_amounts": [
  ],
  "total_tax_amounts": [
  ],
  "total_taxes": [
  ],
  "transfer_data": null,
  "webhooks_delivered_at": 1743397973
}


payment_intent.created
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "pi_3R8aeYC4oQv4vCtF0MCMguCg",
  "object": "payment_intent",
  "last_payment_error": null,
  "livemode": false,
  "next_action": null,
  "status": "requires_payment_method",
  "amount": 6500,
  "amount_capturable": 0,
  "amount_details": {
    "tip": {
    }
  },
  "amount_received": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "automatic_payment_methods": null,
  "canceled_at": null,
  "cancellation_reason": null,
  "capture_method": "automatic",
  "client_secret": "pi_3R8aeYC4oQv4vCtF0MCMguCg_secret_RRPGJ2uPnALrdCUJDtDQcGKRM",
  "confirmation_method": "automatic",
  "created": 1743397974,
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Payment for Invoice",
  "invoice": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
  "latest_charge": null,
  "metadata": {
  },
  "on_behalf_of": null,
  "payment_method": null,
  "payment_method_configuration_details": null,
  "payment_method_options": {
    "card": {
      "installments": null,
      "mandate_options": null,
      "network": null,
      "request_three_d_secure": "automatic"
    },
    "link": {
      "persistent_token": null
    }
  },
  "payment_method_types": [
    "card",
    "link"
  ],
  "processing": null,
  "receipt_email": null,
  "review": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}


invoice.updated
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
  "object": "invoice",
  "livemode": false,
  "payment_intent": "pi_3R8aeYC4oQv4vCtF0MCMguCg",
  "status": "open",
  "account_country": "US",
  "account_name": "Pepe Caranta",
  "account_tax_ids": null,
  "amount_due": 6500,
  "amount_overpaid": 0,
  "amount_paid": 0,
  "amount_remaining": 6500,
  "amount_shipping": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "attempt_count": 0,
  "attempted": false,
  "auto_advance": false,
  "automatic_tax": {
    "disabled_reason": null,
    "enabled": false,
    "liability": null,
    "status": null
  },
  "automatically_finalizes_at": null,
  "billing_reason": "manual",
  "charge": null,
  "collection_method": "send_invoice",
  "created": 1743397973,
  "currency": "eur",
  "custom_fields": [
    {
      "name": "Referencia de Pago",
      "value": "pi_3R8aeWC4oQv4vCtF1Us9y78Z"
    }
  ],
  "customer": "cus_Rn8J5Wbe3ag16g",
  "customer_address": null,
  "customer_email": "urieltac11@gmail.com",
  "customer_name": null,
  "customer_phone": null,
  "customer_shipping": null,
  "customer_tax_exempt": "none",
  "customer_tax_ids": [
  ],
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [
  ],
  "description": "Factura: Pago completo - Turno en Pista 3",
  "discount": null,
  "discounts": [
  ],
  "due_date": 1743465599,
  "effective_at": 1743397974,
  "ending_balance": 0,
  "footer": null,
  "from_invoice": null,
  "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NQ0200Afat6v4C?s=ap",
  "invoice_pdf": "https://pay.stripe.com/invoice/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NQ0200Afat6v4C/pdf?s=ap",
  "issuer": {
    "type": "self"
  },
  "last_finalization_error": null,
  "latest_revision": null,
  "lines": {
    "object": "list",
    "data": [
      {
        "id": "il_1R8aeXC4oQv4vCtFYMRXYlZt",
        "object": "line_item",
        "amount": 6500,
        "amount_excluding_tax": 6500,
        "currency": "eur",
        "description": "Pago completo - Turno en Pista 3",
        "discount_amounts": [
        ],
        "discountable": true,
        "discounts": [
        ],
        "invoice": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
        "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
        "livemode": false,
        "metadata": {
        },
        "parent": {
          "invoice_item_details": {
            "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
            "proration": false,
            "proration_details": {
              "credited_items": null
            },
            "subscription": null
          },
          "subscription_item_details": null,
          "type": "invoice_item_details"
        },
        "period": {
          "end": 1743397973,
          "start": 1743397973
        },
        "plan": null,
        "pretax_credit_amounts": [
        ],
        "price": {
          "id": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
          "object": "price",
          "active": false,
          "billing_scheme": "per_unit",
          "created": 1743397973,
          "currency": "eur",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {
          },
          "nickname": null,
          "product": "prod_S2g0bvg33Bw8y6",
          "recurring": null,
          "tax_behavior": "unspecified",
          "tiers_mode": null,
          "transform_quantity": null,
          "type": "one_time",
          "unit_amount": 6500,
          "unit_amount_decimal": "6500"
        },
        "pricing": {
          "price_details": {
            "price": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
            "product": "prod_S2g0bvg33Bw8y6"
          },
          "type": "price_details",
          "unit_amount_decimal": "6500"
        },
        "proration": false,
        "proration_details": {
          "credited_items": null
        },
        "quantity": 1,
        "subscription": null,
        "tax_amounts": [
        ],
        "tax_rates": [
        ],
        "taxes": [
        ],
        "type": "invoiceitem",
        "unit_amount_excluding_tax": "6500"
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/invoices/in_1R8aeXC4oQv4vCtFNXBQzP5g/lines"
  },
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "payment_intent_id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
    "payment_type": "booking"
  },
  "next_payment_attempt": null,
  "number": "88669574-0001",
  "on_behalf_of": null,
  "paid": false,
  "paid_out_of_band": false,
  "parent": null,
  "payment_settings": {
    "default_mandate": null,
    "payment_method_options": null,
    "payment_method_types": null
  },
  "period_end": 1743397973,
  "period_start": 1743397973,
  "post_payment_credit_notes_amount": 0,
  "pre_payment_credit_notes_amount": 0,
  "quote": null,
  "receipt_number": null,
  "rendering": {
    "amount_tax_display": null,
    "pdf": {
      "page_size": "letter"
    },
    "template": null,
    "template_version": null
  },
  "shipping_cost": null,
  "shipping_details": null,
  "starting_balance": 0,
  "statement_descriptor": null,
  "status_transitions": {
    "finalized_at": 1743397974,
    "marked_uncollectible_at": null,
    "paid_at": null,
    "voided_at": null
  },
  "subscription": null,
  "subscription_details": {
    "metadata": null
  },
  "subtotal": 6500,
  "subtotal_excluding_tax": 6500,
  "tax": null,
  "test_clock": null,
  "total": 6500,
  "total_discount_amounts": [
  ],
  "total_excluding_tax": 6500,
  "total_pretax_credit_amounts": [
  ],
  "total_tax_amounts": [
  ],
  "total_taxes": [
  ],
  "transfer_data": null,
  "webhooks_delivered_at": 1743397973
}


invoice.finalized
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
  "object": "invoice",
  "livemode": false,
  "payment_intent": "pi_3R8aeYC4oQv4vCtF0MCMguCg",
  "status": "open",
  "account_country": "US",
  "account_name": "Pepe Caranta",
  "account_tax_ids": null,
  "amount_due": 6500,
  "amount_overpaid": 0,
  "amount_paid": 0,
  "amount_remaining": 6500,
  "amount_shipping": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "attempt_count": 0,
  "attempted": false,
  "auto_advance": false,
  "automatic_tax": {
    "disabled_reason": null,
    "enabled": false,
    "liability": null,
    "status": null
  },
  "automatically_finalizes_at": null,
  "billing_reason": "manual",
  "charge": null,
  "collection_method": "send_invoice",
  "created": 1743397973,
  "currency": "eur",
  "custom_fields": [
    {
      "name": "Referencia de Pago",
      "value": "pi_3R8aeWC4oQv4vCtF1Us9y78Z"
    }
  ],
  "customer": "cus_Rn8J5Wbe3ag16g",
  "customer_address": null,
  "customer_email": "urieltac11@gmail.com",
  "customer_name": null,
  "customer_phone": null,
  "customer_shipping": null,
  "customer_tax_exempt": "none",
  "customer_tax_ids": [
  ],
  "default_payment_method": null,
  "default_source": null,
  "default_tax_rates": [
  ],
  "description": "Factura: Pago completo - Turno en Pista 3",
  "discount": null,
  "discounts": [
  ],
  "due_date": 1743465599,
  "effective_at": 1743397974,
  "ending_balance": 0,
  "footer": null,
  "from_invoice": null,
  "hosted_invoice_url": "https://invoice.stripe.com/i/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NQ0200Afat6v4C?s=ap",
  "invoice_pdf": "https://pay.stripe.com/invoice/acct_1QddDLC4oQv4vCtF/test_YWNjdF8xUWRkRExDNG9RdjR2Q3RGLF9TMmcwTmRtcUx6QlpwRGJOZmhtUXAwOVlIcllYY2N2LDEzMzkzODc3NQ0200Afat6v4C/pdf?s=ap",
  "issuer": {
    "type": "self"
  },
  "last_finalization_error": null,
  "latest_revision": null,
  "lines": {
    "object": "list",
    "data": [
      {
        "id": "il_1R8aeXC4oQv4vCtFYMRXYlZt",
        "object": "line_item",
        "amount": 6500,
        "amount_excluding_tax": 6500,
        "currency": "eur",
        "description": "Pago completo - Turno en Pista 3",
        "discount_amounts": [
        ],
        "discountable": true,
        "discounts": [
        ],
        "invoice": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
        "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
        "livemode": false,
        "metadata": {
        },
        "parent": {
          "invoice_item_details": {
            "invoice_item": "ii_1R8aeXC4oQv4vCtFM78lIdP9",
            "proration": false,
            "proration_details": {
              "credited_items": null
            },
            "subscription": null
          },
          "subscription_item_details": null,
          "type": "invoice_item_details"
        },
        "period": {
          "end": 1743397973,
          "start": 1743397973
        },
        "plan": null,
        "pretax_credit_amounts": [
        ],
        "price": {
          "id": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
          "object": "price",
          "active": false,
          "billing_scheme": "per_unit",
          "created": 1743397973,
          "currency": "eur",
          "custom_unit_amount": null,
          "livemode": false,
          "lookup_key": null,
          "metadata": {
          },
          "nickname": null,
          "product": "prod_S2g0bvg33Bw8y6",
          "recurring": null,
          "tax_behavior": "unspecified",
          "tiers_mode": null,
          "transform_quantity": null,
          "type": "one_time",
          "unit_amount": 6500,
          "unit_amount_decimal": "6500"
        },
        "pricing": {
          "price_details": {
            "price": "price_1R8aeXC4oQv4vCtFDKUs6pL3",
            "product": "prod_S2g0bvg33Bw8y6"
          },
          "type": "price_details",
          "unit_amount_decimal": "6500"
        },
        "proration": false,
        "proration_details": {
          "credited_items": null
        },
        "quantity": 1,
        "subscription": null,
        "tax_amounts": [
        ],
        "tax_rates": [
        ],
        "taxes": [
        ],
        "type": "invoiceitem",
        "unit_amount_excluding_tax": "6500"
      }
    ],
    "has_more": false,
    "total_count": 1,
    "url": "/v1/invoices/in_1R8aeXC4oQv4vCtFNXBQzP5g/lines"
  },
  "metadata": {
    "customer_email": "urieltac11@gmail.com",
    "payment_intent_id": "pi_3R8aeWC4oQv4vCtF1Us9y78Z",
    "payment_type": "booking"
  },
  "next_payment_attempt": null,
  "number": "88669574-0001",
  "on_behalf_of": null,
  "paid": false,
  "paid_out_of_band": false,
  "parent": null,
  "payment_settings": {
    "default_mandate": null,
    "payment_method_options": null,
    "payment_method_types": null
  },
  "period_end": 1743397973,
  "period_start": 1743397973,
  "post_payment_credit_notes_amount": 0,
  "pre_payment_credit_notes_amount": 0,
  "quote": null,
  "receipt_number": null,
  "rendering": {
    "amount_tax_display": null,
    "pdf": {
      "page_size": "letter"
    },
    "template": null,
    "template_version": null
  },
  "shipping_cost": null,
  "shipping_details": null,
  "starting_balance": 0,
  "statement_descriptor": null,
  "status_transitions": {
    "finalized_at": 1743397974,
    "marked_uncollectible_at": null,
    "paid_at": null,
    "voided_at": null
  },
  "subscription": null,
  "subscription_details": {
    "metadata": null
  },
  "subtotal": 6500,
  "subtotal_excluding_tax": 6500,
  "tax": null,
  "test_clock": null,
  "total": 6500,
  "total_discount_amounts": [
  ],
  "total_excluding_tax": 6500,
  "total_pretax_credit_amounts": [
  ],
  "total_tax_amounts": [
  ],
  "total_taxes": [
  ],
  "transfer_data": null,
  "webhooks_delivered_at": 1743397973
}


payment_intent.canceled
Inspeccionar detalles del evento en Workbench
Datos del evento
{
  "id": "pi_3R8aeYC4oQv4vCtF0MCMguCg",
  "object": "payment_intent",
  "last_payment_error": null,
  "livemode": false,
  "next_action": null,
  "status": "canceled",
  "amount": 6500,
  "amount_capturable": 0,
  "amount_details": {
    "tip": {
    }
  },
  "amount_received": 0,
  "application": "ca_RWg6q5h6Nom5TGwbAhXrL0QmlU4KTYOD",
  "application_fee_amount": null,
  "automatic_payment_methods": null,
  "canceled_at": 1743397975,
  "cancellation_reason": "requested_by_customer",
  "capture_method": "automatic",
  "client_secret": "pi_3R8aeYC4oQv4vCtF0MCMguCg_secret_RRPGJ2uPnALrdCUJDtDQcGKRM",
  "confirmation_method": "automatic",
  "created": 1743397974,
  "currency": "eur",
  "customer": "cus_Rn8J5Wbe3ag16g",
  "description": "Payment for Invoice",
  "invoice": "in_1R8aeXC4oQv4vCtFNXBQzP5g",
  "latest_charge": null,
  "metadata": {
  },
  "on_behalf_of": null,
  "payment_method": null,
  "payment_method_configuration_details": null,
  "payment_method_options": {
    "card": {
      "installments": null,
      "mandate_options": null,
      "network": null,
      "request_three_d_secure": "automatic"
    },
    "link": {
      "persistent_token": null
    }
  },
  "payment_method_types": [
    "card",
    "link"
  ],
  "processing": null,
  "receipt_email": null,
  "review": null,
  "setup_future_usage": null,
  "shipping": null,
  "source": null,
  "statement_descriptor": null,
  "statement_descriptor_suffix": null,
  "transfer_data": null,
  "transfer_group": null
}