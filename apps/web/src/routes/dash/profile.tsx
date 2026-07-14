import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useStudentProfile } from "@/api/profile";
import { ProfilePageSkeleton } from "@/features/profile/components/profile-skeleton";
import { ProfilePreviewCard } from "@/features/profile/components/profile-preview-card";
import { ProfileEditForm } from "@/features/profile/components/profile-edit-form";

export const Route = createFileRoute("/dash/profile")({
  component: ProfileComponent,
});

function ProfileComponent() {
  const { data, isLoading } = useStudentProfile();
  const [image, setImage] = React.useState<string | null>(null);

  // Sync image from server data
  React.useEffect(() => {
    if (data?.user.image) {
      setImage(data.user.image);
    }
  }, [data?.user.image]);

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  if (!data) return null;

  const formDefaults = {
    name: data.user.name || "",
    headline: data.profile?.headline || "",
    bio: data.profile?.bio || "",
    phone: data.profile?.phone || "",
    country: data.profile?.country || "",
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 pb-12 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your public profile, update details, and manage email alerts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Profile Card Preview */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <ProfilePreviewCard
            name={formDefaults.name}
            email={data.user.email}
            image={image}
            headline={formDefaults.headline}
            phone={formDefaults.phone}
            country={formDefaults.country}
            onImageChange={setImage}
          />
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="md:col-span-2">
          <ProfileEditForm defaultValues={formDefaults} email={data.user.email} image={image} />
        </div>
      </div>
    </div>
  );
}
