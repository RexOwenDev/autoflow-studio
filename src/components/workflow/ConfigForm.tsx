"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import type { ConfigField, Template } from "@/lib/templates/schema";
import { cn } from "@/lib/utils";

interface ConfigFormProps {
  template: Template;
  /** Names of fields that failed server-side validation on the prior submit. */
  errorFields?: readonly string[];
  /** Pre-filled values for edit mode. */
  initialConfig?: Readonly<Record<string, string | number | boolean>>;
}

export function ConfigForm({ template, errorFields = [], initialConfig = {} }: ConfigFormProps) {
  const errorSet = React.useMemo(() => new Set(errorFields), [errorFields]);

  return (
    <div className="space-y-4">
      {template.fields.map((field) => (
        <FieldRow
          key={field.name}
          field={field}
          initial={initialConfig[field.name]}
          hasError={errorSet.has(field.name)}
        />
      ))}
    </div>
  );
}

interface FieldRowProps {
  field: ConfigField;
  initial: string | number | boolean | undefined;
  hasError: boolean;
}

function FieldRow({ field, initial, hasError }: FieldRowProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`cfg-${field.name}`}
        className="flex items-center gap-2 text-xs font-medium text-[var(--foreground-muted)]"
      >
        {field.label}
        {"required" in field && field.required && <span className="text-[var(--error)]">*</span>}
      </label>
      {"description" in field && field.description && (
        <p className="text-xs text-[var(--foreground-subtle)]">{field.description}</p>
      )}
      <FieldControl field={field} initial={initial} hasError={hasError} />
      {hasError && (
        <p className="text-xs text-[var(--error)]" role="alert">
          This field is invalid.
        </p>
      )}
    </div>
  );
}

function FieldControl({ field, initial, hasError }: FieldRowProps) {
  const id = `cfg-${field.name}`;
  const errorClass = hasError ? "border-[var(--error)] focus-visible:ring-[var(--error)]" : "";

  switch (field.kind) {
    case "text":
      return (
        <Input
          id={id}
          name={field.name}
          type="text"
          className={errorClass}
          required={field.required}
          placeholder={field.placeholder}
          minLength={field.minLength}
          maxLength={field.maxLength}
          defaultValue={typeof initial === "string" ? initial : (field.defaultValue ?? "")}
        />
      );
    case "email":
      return (
        <Input
          id={id}
          name={field.name}
          type="email"
          className={errorClass}
          required={field.required}
          maxLength={field.maxLength}
          defaultValue={typeof initial === "string" ? initial : ""}
        />
      );
    case "url":
      return (
        <Input
          id={id}
          name={field.name}
          type="url"
          className={errorClass}
          required={field.required}
          maxLength={field.maxLength}
          defaultValue={typeof initial === "string" ? initial : ""}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          name={field.name}
          type="number"
          className={errorClass}
          required={field.required}
          min={field.min}
          max={field.max}
          defaultValue={typeof initial === "number" ? initial : (field.defaultValue ?? "")}
        />
      );
    case "boolean":
      return <BooleanField field={field} initial={initial} id={id} />;
    case "select":
      return (
        <select
          id={id}
          name={field.name}
          required={field.required}
          defaultValue={
            typeof initial === "string"
              ? initial
              : (field.defaultValue ?? field.options[0]?.value ?? "")
          }
          className={cn(
            "flex h-9 w-full rounded-[var(--radius)] border border-[var(--border)]",
            "bg-[var(--surface)] px-3 py-1 text-sm text-[var(--foreground)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]",
            errorClass,
          )}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "secret":
      return <SecretField field={field} id={id} hasError={hasError} />;
  }
}

function BooleanField({
  field,
  initial,
  id,
}: {
  field: Extract<ConfigField, { kind: "boolean" }>;
  initial: string | number | boolean | undefined;
  id: string;
}) {
  const defaultChecked = typeof initial === "boolean" ? initial : Boolean(field.defaultValue);

  return (
    <label htmlFor={id} className="flex items-center gap-2 cursor-pointer select-none">
      <input
        id={id}
        name={field.name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="w-4 h-4 rounded border-[var(--border)] accent-[var(--brand)]"
      />
      <span className="text-sm text-[var(--foreground-muted)]">
        {defaultChecked ? "Enabled" : "Disabled"} by default
      </span>
    </label>
  );
}

function SecretField({
  field,
  id,
  hasError,
}: {
  field: Extract<ConfigField, { kind: "secret" }>;
  id: string;
  hasError: boolean;
}) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={field.name}
        type={revealed ? "text" : "password"}
        required={field.required}
        autoComplete="off"
        spellCheck={false}
        placeholder="••••••••"
        className={cn(
          "pr-10",
          hasError && "border-[var(--error)] focus-visible:ring-[var(--error)]",
        )}
      />
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        aria-label={revealed ? "Hide secret" : "Reveal secret"}
      >
        {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
