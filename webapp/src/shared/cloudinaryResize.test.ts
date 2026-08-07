import { describe, expect, it } from "vitest";
import { cloudinaryResize } from "./cloudinaryResize";

describe("cloudinaryResize", () => {
  it("inserts the transform after /upload/", () => {
    const url =
      "https://res.cloudinary.com/kjc06l7o/image/upload/v123/routeev/vehicle-models/foo.jpg";
    expect(cloudinaryResize(url, 400)).toBe(
      "https://res.cloudinary.com/kjc06l7o/image/upload/w_400,q_auto,f_auto/v123/routeev/vehicle-models/foo.jpg"
    );
  });

  it("leaves non-Cloudinary URLs untouched", () => {
    const url = "https://routeev-api-production.up.railway.app/api/showroom/imagen/abc123.jpg";
    expect(cloudinaryResize(url, 400)).toBe(url);
  });

  it("passes through undefined", () => {
    expect(cloudinaryResize(undefined, 400)).toBeUndefined();
  });
});
