import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Input } from "@heroui/input";
import { useEffect } from "react";
import { useRouter } from "next/router";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  const isAuthenticated = () => {
    // Replace with your actual auth check logic
    if (typeof window === "undefined") return false;

    return !!localStorage.getItem("authToken");
  };

  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, []);

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-8 py-12 md:py-20">
        {/* Hero Section */}
        <div className="inline-block max-w-2xl text-center">
          <span className={title()}>Build neural networks&nbsp;</span>
          <span className={title({ color: "violet" })}>visually&nbsp;</span>
          <span className={title()}>with&nbsp;</span>
          <span className={title({ color: "foreground" })}>neod</span>
          <div className={subtitle({ class: "mt-4" })}>
            Drag and drop layers, connect nodes, and create powerful neural
            networks in your browser. No code required.
          </div>
        </div>

        {/* Call to Action */}
        <div className="flex gap-4">
          <Link
            className={buttonStyles({
              color: "primary",
              radius: "full",
              variant: "shadow",
            })}
            href="/dashboard"
          >
            Go to Dashboard
          </Link>
          <Link
            className={buttonStyles({
              variant: "bordered", 
              radius: "full",
            })}
            href="/neuralnetwork"
          >
            Neural Network Builder
          </Link>
          <Link
            isExternal
            className={buttonStyles({ variant: "bordered", radius: "full" })}
            href={siteConfig.links.github}
          >
            <GithubIcon size={20} />
            GitHub
          </Link>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-8">
          <Card>
            <CardHeader>
              <Avatar
                className="bg-violet-100"
                color="primary"
                name="Drag"
                size="md"
              />
              <span className="ml-3 font-semibold">Drag & Drop Builder</span>
            </CardHeader>
            <CardBody>
              <p>
                Intuitively design neural networks by dragging and connecting
                layers—no coding needed.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <Avatar
                className="bg-green-100"
                color="success"
                name="Visualize"
                size="md"
              />
              <span className="ml-3 font-semibold">Live Visualization</span>
            </CardHeader>
            <CardBody>
              <p>
                Instantly see your network architecture and connections as you
                build.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <Avatar
                className="bg-yellow-100"
                color="warning"
                name="Export"
                size="md"
              />
              <span className="ml-3 font-semibold">Export & Integrate</span>
            </CardHeader>
            <CardBody>
              <p>
                Export your models to popular frameworks or share with your team
                in one click.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Newsletter Signup */}
        <div className="w-full max-w-md mt-10">
          <Card>
            <CardHeader>
              <span className="font-semibold text-lg">Stay updated</span>
            </CardHeader>
            <CardBody>
              <form className="flex gap-2">
                <Input required placeholder="Your email" type="email" />
                <button
                  className={buttonStyles({ color: "primary", radius: "full" })}
                  type="submit"
                >
                  Subscribe
                </button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* Code Snippet */}
        <div className="mt-8">
          <Snippet hideCopyButton hideSymbol variant="bordered">
            <span>
              Start building by editing{" "}
              <Code color="primary">pages/index.tsx</Code>
            </span>
          </Snippet>
        </div>
      </section>
    </DefaultLayout>
  );
}
