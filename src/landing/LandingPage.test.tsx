import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { LandingPage } from "./LandingPage";

function renderLanding() {
  const queryClient = new QueryClient();
  return render(
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe("LandingPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the hero thesis and both guest CTAs", () => {
    renderLanding();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/tu batería tampoco/i);
    expect(screen.getByRole("link", { name: /^iniciar sesión$/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /^crear cuenta$/i })).toHaveAttribute("href", "/login?crear=1");
  });

  it("swaps the CTA to 'Ir a la app' when a session already exists", () => {
    localStorage.setItem("routeev_token", "fake-token");
    renderLanding();
    expect(screen.getByRole("link", { name: /ir a la app/i })).toHaveAttribute("href", "/app");
    expect(screen.queryByRole("link", { name: /^iniciar sesión$/i })).not.toBeInTheDocument();
  });

  it("renders all four real stats", () => {
    renderLanding();
    expect(screen.getByText("630")).toBeInTheDocument();
    expect(screen.getByText("260")).toBeInTheDocument();
  });
});
