import * as React from "react";
import { Card } from "@oedulms/ui/components/card";
import { Avatar, AvatarFallback, AvatarImage } from "@oedulms/ui/components/avatar";
import { Button } from "@oedulms/ui/components/button";
import { Globe, Phone, MapPin, Loader2 } from "lucide-react";
import { uploadFileToS3 } from "@/api/media";
import { useUpdateStudentProfile } from "@/api/profile";
import { toast } from "sonner";
import { getInitials } from "@/lib/helper";

interface ProfilePreviewCardProps {
  name: string;
  email?: string | null;
  image?: string | null;
  headline?: string;
  phone?: string;
  country?: string;
  onImageChange: (url: string) => void;
}

export function ProfilePreviewCard({
  name,
  email,
  image,
  headline,
  phone,
  country,
  onImageChange,
}: ProfilePreviewCardProps) {
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const updateProfileMutation = useUpdateStudentProfile();

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const res = await uploadFileToS3(file, "avatars");
      onImageChange(res.fileUrl);
      await updateProfileMutation.mutateAsync({
        name,
        image: res.fileUrl,
      });
      toast.success("Avatar updated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload avatar.";
      toast.error(msg);
      console.error(err);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Card className="border border-border/50 shadow-sm text-center p-6 flex flex-col items-center">
      <div className="relative group">
        <Avatar className="size-24 border-2 border-primary/20 shadow-md">
          {image ? <AvatarImage src={image} alt={name || "User avatar"} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
            {getInitials(name || "S")}
          </AvatarFallback>
        </Avatar>

        {isUploadingAvatar && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-full">
            <Loader2 className="animate-spin text-primary size-6" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={handleAvatarClick}
        disabled={isUploadingAvatar}
        className="mt-3 text-xs"
      >
        {isUploadingAvatar ? "Uploading..." : "Change Photo"}
      </Button>

      <h3 className="font-bold text-lg mt-4 leading-tight">{name}</h3>
      <span className="text-xs text-primary font-semibold uppercase tracking-wider mt-1.5 px-2.5 py-0.5 bg-primary/10 rounded-full">
        Student
      </span>

      {headline && (
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-[200px]">
          {headline}
        </p>
      )}

      <div className="w-full border-t border-border/40 mt-5 pt-5 flex flex-col gap-3.5 text-xs text-muted-foreground text-left">
        <div className="flex items-center gap-2">
          <Globe className="size-4 shrink-0 text-muted-foreground/80" />
          <span className="truncate">{email}</span>
        </div>
        {phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0 text-muted-foreground/80" />
            <span>{phone}</span>
          </div>
        )}
        {country && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground/80" />
            <span>{country}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
