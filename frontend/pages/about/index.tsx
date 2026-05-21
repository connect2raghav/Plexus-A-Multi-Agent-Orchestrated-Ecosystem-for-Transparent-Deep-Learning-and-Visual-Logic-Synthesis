import { title, subtitle } from "@/components/primitives";
import DefaultLayout from "@/layouts/default";
import { PlexusLogo } from "@/components/PlexusLogo";

export default function AboutPage() {
  return (
    <DefaultLayout
      description="Learn more about Plexus - Visual Neural Network Designer"
      title="About"
    >
      <section className="flex flex-col items-center justify-center gap-8 py-8 md:py-10">
        <div className="inline-block max-w-4xl text-center justify-center">
          <div className="flex justify-center mb-6">
            <PlexusLogo size="xl" />
          </div>
          <h1 className={title()}>About Plexus</h1>
          <div className={subtitle({ class: "mt-4" })}>
            Visual Neural Network Designer - Making AI accessible to everyone
          </div>
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-6">
          <p className="text-lg text-default-700">
            Plexus is a revolutionary visual neural network designer that
            empowers users to create, train, and deploy AI models using an
            intuitive drag-and-drop interface. Whether you&apos;re a beginner
            exploring machine learning or an expert prototyping complex
            architectures, Plexus makes neural network development accessible
            and efficient.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3">Visual First</h3>
              <p className="text-default-600">
                Design neural networks visually with our intuitive drag-and-drop
                interface. No complex coding required.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3">Framework Agnostic</h3>
              <p className="text-default-600">
                Generate code for TensorFlow, PyTorch, and other popular
                frameworks. Export to Jupyter notebooks for immediate use.
              </p>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold mb-3">Production Ready</h3>
              <p className="text-default-600">
                From prototype to production, Plexus generates clean, optimized
                code ready for training and deployment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </DefaultLayout>
  );
}
