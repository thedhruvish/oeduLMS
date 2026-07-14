import { useForm } from "@tanstack/react-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@oedulms/ui/components/card";
import { Button } from "@oedulms/ui/components/button";
import { Input } from "@oedulms/ui/components/input";
import { Textarea } from "@oedulms/ui/components/textarea";
import { Field, FieldGroup, FieldLabel } from "@oedulms/ui/components/field";
import { FormError } from "@/components/ui/form-error";
import { useUpdateStudentProfile } from "@/api/profile";
import { studentProfileSchema } from "@oedulms/validator";
import { User, Compass, Phone, MapPin, Globe, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
  defaultValues: {
    name: string;
    headline: string;
    bio: string;
    phone: string;
    country: string;
  };
  email?: string | null;
  image?: string | null;
}

export function ProfileEditForm({ defaultValues, email, image }: ProfileEditFormProps) {
  const updateProfileMutation = useUpdateStudentProfile();

  const form = useForm({
    defaultValues,
    validators: {
      onChange: studentProfileSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProfileMutation.mutateAsync({
          name: value.name,
          headline: value.headline,
          bio: value.bio,
          phone: value.phone,
          country: value.country,
          image: image || undefined,
        });
        toast.success("Profile updated successfully!");
      } catch {
        toast.error("Failed to update profile.");
      }
    },
  });

  return (
    <Card className="border border-border/50 shadow-sm h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold">Profile Details</CardTitle>
        <CardDescription className="text-xs">
          This information is shown to fellow students and teachers on the discussion boards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          id="profile-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            {/* Name */}
            <form.Field name="name">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel
                      htmlFor={field.name}
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <User className="size-3.5" />
                      Full Name
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="e.g. John Doe"
                      className="focus-visible:ring-primary/30"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Email (Disabled) */}
            <Field>
              <FieldLabel className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Globe className="size-3.5" />
                Email Address
              </FieldLabel>
              <Input
                type="email"
                value={email || ""}
                disabled
                className="bg-muted/50 cursor-not-allowed opacity-80"
              />
              <span className="text-[10px] text-muted-foreground/75 flex items-center gap-1">
                <ShieldAlert className="size-3 shrink-0" />
                Email addresses cannot be changed directly for security.
              </span>
            </Field>

            {/* Headline */}
            <form.Field name="headline">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel
                      htmlFor={field.name}
                      className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                    >
                      <Compass className="size-3.5" />
                      Headline
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="e.g. Aspiring Software Developer | React Enthusiast"
                      className="focus-visible:ring-primary/30"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Bio */}
            <form.Field name="bio">
              {(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel
                      htmlFor={field.name}
                      className="text-xs font-semibold text-foreground"
                    >
                      Biography
                    </FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Tell us a little bit about yourself, your learning goals..."
                      className="min-h-24 resize-none focus-visible:ring-primary/30"
                    />
                    <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* Phone & Country Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="phone">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                      >
                        <Phone className="size-3.5" />
                        Phone Number
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="tel"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="e.g. +1 (555) 000-0000"
                        className="focus-visible:ring-primary/30"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="country">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel
                        htmlFor={field.name}
                        className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                      >
                        <MapPin className="size-3.5" />
                        Country / Region
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="e.g. United States"
                        className="focus-visible:ring-primary/30"
                      />
                      <FormError isInvalid={isInvalid} errors={field.state.meta.errors} />
                    </Field>
                  );
                }}
              </form.Field>
            </div>
          </FieldGroup>

          {/* Action Buttons */}
          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              form="profile-edit-form"
              disabled={updateProfileMutation.isPending}
              className="px-6 font-semibold"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Saving changes...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
