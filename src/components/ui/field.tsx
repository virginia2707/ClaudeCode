import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn("w-full", className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-danger">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-text-subtle">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input", className)} {...rest}>
      {children}
    </select>
  );
}
