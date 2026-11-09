import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route as SignInRoute } from "../routes/sign-in";
import { Route as SignUpRoute } from "../routes/sign-up";
import { Route as ForgotPasswordRoute } from "../routes/forgot-password";
import { authApi } from "../lib/auth";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../lib/auth", async () => {
  const actual = await vi.importActual<any>("../lib/auth");
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      ready: true,
      setUser: vi.fn(),
    }),
    authApi: {
      signIn: vi.fn().mockResolvedValue({ id: "123", name: "Deepak", email: "deepak@example.com", role: "admin" }),
      signUp: vi.fn().mockResolvedValue({ id: "456", name: "Adit", email: "adit@example.com", role: "user" }),
      requestPasswordReset: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe("Authentication & Account Lifecycle Automated Tests", () => {
  describe("Sign In View", () => {
    it("renders email and password inputs and submits credentials", async () => {
      const Component = (SignInRoute as any).component;
      render(<Component />);

      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const submitBtn = screen.getByRole("button", { name: /Sign in/i });

      fireEvent.change(emailInput, { target: { value: "dyanndlee05@gmail.com" } });
      fireEvent.change(passwordInput, { target: { value: "Password123!" } });
      fireEvent.click(submitBtn);

      expect(authApi.signIn).toHaveBeenCalledWith("dyanndlee05@gmail.com", "Password123!");
    });
  });

  describe("Sign Up View & Rule 4.2 Age Verification", () => {
    it("renders name, email, password, and Rule 4.2 age verification", () => {
      const Component = (SignUpRoute as any).component;
      render(<Component />);

      expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
      expect(screen.getByText(/Rule 4.2/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create account/i })).toBeInTheDocument();
    });
  });

  describe("Forgot Password View", () => {
    it("renders password reset email submission", () => {
      const Component = (ForgotPasswordRoute as any).component;
      render(<Component />);

      expect(screen.getByText(/Forgot password\?/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Send reset link/i })).toBeInTheDocument();
    });
  });
});
