import { useState } from "react";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button.tsx";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button.tsx";

export interface SignInButtonProps
  extends
    Omit<React.ComponentProps<"button">, "onClick">,
    VariantProps<typeof buttonVariants> {
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  showIcon?: boolean;
  signInText?: string;
  signOutText?: string;
  loadingText?: string;
  asChild?: boolean;
}

export const SignInButton = ({
  onClick,
  disabled,
  showIcon = true,
  signInText = "Sign In with Google",
  signOutText = "Sign Out",
  loadingText,
  className,
  variant,
  size,
  asChild = false,
  ...props
}: SignInButtonProps) => {
  const { isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const [pending, setPending] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    setPending(true);
    try {
      if (isAuthenticated) {
        await signOut();
      } else {
        const result = await signIn("google");
        if (result?.redirect) {
          window.open(result.redirect.toString(), "_self");
        }
      }
    } catch (err) {
      console.error("Authentication error:", err);
      toast.error("Sign in failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPending(false);
    }
  };

  const currentLoadingText = loadingText ?? (isAuthenticated ? "Signing Out..." : "Signing In...");

  const icon = pending ? (
    <Loader2 className="size-4 animate-spin" />
  ) : isAuthenticated ? (
    <LogOut className="size-4" />
  ) : (
    <LogIn className="size-4" />
  );

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || pending}
      variant={variant}
      size={size}
      className={className}
      asChild={asChild}
      {...props}
    >
      {showIcon && icon}
      {pending ? currentLoadingText : isAuthenticated ? signOutText : signInText}
    </Button>
  );
};

SignInButton.displayName = "SignInButton";
