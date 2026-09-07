import AuthPageTransition from "@/app/components/AuthPageTransition";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthPageTransition>
      {children}
    </AuthPageTransition>
  );
}