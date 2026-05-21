import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { useRouter } from "next/router";
import {
  Brain,
  Zap,
  Code,
  Download,
  Users,
  Star,
  ArrowRight,
  Play,
  MousePointer,
  Layers,
  BarChart3,
  Sparkles,
} from "lucide-react";

import { PlexusLogo } from "@/components/PlexusLogo";
import DefaultLayout from "@/layouts/default";

export default function IndexPage() {
  const router = useRouter();

  return (
    <DefaultLayout
      description="Create powerful neural networks with visual drag-and-drop interface"
      title="Home"
    >
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-950/30 dark:to-secondary-950/30 px-6 py-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Logo and Badge */}
          <div className="flex justify-center mb-6">
            <PlexusLogo size="xl" />
          </div>

          <Chip
            className="mb-6"
            color="primary"
            size="sm"
            startContent={<Sparkles className="w-3 h-3" />}
            variant="flat"
          >
            Visual Neural Network Designer
          </Chip>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6">
            Build AI Models
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Visually
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-default-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Create, train, and deploy neural networks with an intuitive
            drag-and-drop interface. No coding required – from prototype to
            production in minutes.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              className="text-lg px-8 py-6 h-auto font-semibold"
              color="primary"
              size="lg"
              startContent={<Play className="w-5 h-5" />}
              onPress={() => router.push("/neuralnetwork")}
            >
              Start Building
            </Button>

            <Button
              className="text-lg px-8 py-6 h-auto"
              size="lg"
              startContent={<BarChart3 className="w-5 h-5" />}
              variant="bordered"
              onPress={() => router.push("/dashboard")}
            >
              View Dashboard
            </Button>

            <Button
              className="text-lg px-8 py-6 h-auto"
              size="lg"
              startContent={<Users className="w-5 h-5" />}
              variant="ghost"
              onPress={() => router.push("/login")}
            >
              Login
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-default-500">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-current text-warning" />
              <span>Trusted by 10,000+ developers</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>Deploy in minutes</span>
            </div>
            <div className="flex items-center gap-1">
              <Code className="w-4 h-4" />
              <span>Export to TensorFlow & PyTorch</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose Plexus?
            </h2>
            <p className="text-lg text-default-600 max-w-2xl mx-auto">
              Powerful features designed to make AI development accessible to
              everyone
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 mb-3">
                  <MousePointer className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Drag & Drop Interface</h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  Build complex neural networks by simply dragging and
                  connecting layers. No coding experience required.
                </p>
              </CardBody>
            </Card>

            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-secondary-100 dark:bg-secondary-900/30 mb-3">
                  <Layers className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold">Pre-built Templates</h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  Start with proven architectures like CNN, RNN, Transformers,
                  and more. Customize to fit your needs.
                </p>
              </CardBody>
            </Card>

            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-success-100 dark:bg-success-900/30 mb-3">
                  <Code className="w-6 h-6 text-success" />
                </div>
                <h3 className="text-xl font-semibold">
                  Multi-Framework Export
                </h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  Generate clean, production-ready code for TensorFlow, PyTorch,
                  or export as Jupyter notebooks.
                </p>
              </CardBody>
            </Card>

            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-warning-100 dark:bg-warning-900/30 mb-3">
                  <BarChart3 className="w-6 h-6 text-warning" />
                </div>
                <h3 className="text-xl font-semibold">Real-time Validation</h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  Get instant feedback on your network architecture with
                  built-in validation and optimization suggestions.
                </p>
              </CardBody>
            </Card>

            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-danger-100 dark:bg-danger-900/30 mb-3">
                  <Download className="w-6 h-6 text-danger" />
                </div>
                <h3 className="text-xl font-semibold">One-Click Deploy</h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  Deploy your models directly to cloud platforms or download
                  complete training scripts ready for production.
                </p>
              </CardBody>
            </Card>

            <Card className="p-6">
              <CardHeader className="flex-col items-start p-0 mb-4">
                <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30 mb-3">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Smart Suggestions</h3>
              </CardHeader>
              <CardBody className="p-0">
                <p className="text-default-600">
                  AI-powered recommendations help optimize your network
                  architecture for better performance and efficiency.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Build Your First Neural Network?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of developers and researchers who trust Plexus for
            their AI projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              className="text-lg px-8 py-6 h-auto font-semibold"
              color="default"
              size="lg"
              startContent={<Play className="w-5 h-5" />}
              onPress={() => router.push("/neuralnetwork")}
            >
              Start Building Now
            </Button>
            <Button
              className="text-lg px-8 py-6 h-auto border-white text-white hover:bg-white hover:text-primary"
              size="lg"
              startContent={<ArrowRight className="w-5 h-5" />}
              variant="bordered"
              onPress={() => router.push("/about")}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
