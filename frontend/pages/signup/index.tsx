import { Button, Divider, Form, Input, Link } from "@heroui/react";
import { Icon } from "@iconify/react";
import React from "react";

export default function Signup() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Handle signup submission
  };

  return (
    <div className="bg-default-50 flex min-h-screen items-center justify-center p-4">
      <div className="bg-content1 flex w-full max-w-sm flex-col gap-4 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-medium">Create your account</h2>
        <Form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <Input
            isRequired
            label="Name"
            name="name"
            placeholder="Enter your name"
            type="text"
            variant="bordered"
          />
          <Input
            isRequired
            label="Email"
            name="email"
            placeholder="Enter your email"
            type="email"
            variant="bordered"
          />
          <Input
            isRequired
            label="Password"
            name="password"
            placeholder="Create a password"
            type="password"
            variant="bordered"
          />
          <Input
            isRequired
            label="Confirm Password"
            name="confirmPassword"
            placeholder="Confirm your password"
            type="password"
            variant="bordered"
          />
          <Button className="w-full" color="primary" type="submit">
            Sign Up
          </Button>
        </Form>
        <Divider />
        <div className="flex flex-col gap-2">
          <Button
            startContent={<Icon icon="flat-color-icons:google" width={24} />}
            variant="bordered"
          >
            Sign up with Google
          </Button>
          <Button
            startContent={<Icon icon="fe:github" width={24} />}
            variant="bordered"
          >
            Sign up with GitHub
          </Button>
        </div>
        <p className="text-small text-center">
          Already have an account?{" "}
          <Link href="/login" size="sm">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
