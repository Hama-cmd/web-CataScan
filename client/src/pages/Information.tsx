import { Layout } from "@/components/ui/Layout";
import { Info, BookOpen, ShieldAlert, LifeBuoy, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const infoSections = [
  {
    title: "Eye Health Tips",
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    content: [
      "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
      "Maintain a safe distance from digital screens (about an arm's length).",
      "Ensure proper lighting in your workspace to reduce eye strain.",
      "Wear sunglasses with UV protection when outdoors.",
      "Get regular eye exams even if your vision seems perfect."
    ]
  },
  {
    title: "Common Symptoms",
    icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
    content: [
      "Persistent redness or irritation",
      "Blurred or double vision",
      "Frequent headaches during screen use",
      "Sensitivity to light",
      "Difficulty seeing at night"
    ]
  }
];

const faqs = [
  {
    question: "How accurate is the AI screening?",
    answer: "Our AI model is trained on thousands of ophthalmological images to provide preliminary screenings. While highly capable, it is not a replacement for professional medical diagnosis."
  },
  {
    question: "When should I see a doctor?",
    answer: "You should consult an eye specialist if you experience sudden vision changes, persistent pain, or if the AI screening indicates a potential concern."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we prioritize your privacy. Your screening data and images are stored securely and only accessible to you."
  }
];

export default function Information() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Info className="w-8 h-8 text-primary" />
            Education & Resources
          </h1>
          <p className="text-gray-500 mt-2">Learn how to maintain healthy eyes and understand your screening results.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoSections.map((section, idx) => (
            <Card key={idx} className="border-none shadow-md overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {section.icon}
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-3">
                  {section.content.map((item, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-primary" />
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="w-full bg-white rounded-2xl shadow-sm border px-6">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className={idx === faqs.length - 1 ? "border-none" : ""}>
                <AccordionTrigger className="text-left font-semibold py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <Card className="bg-primary/5 border-primary/10 rounded-2xl p-6">
          <div className="flex gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm h-fit">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Medical Disclaimer</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                This tool is provided for educational and screening purposes only. It is not intended to provide a medical diagnosis or replace the expertise of a qualified eye care professional. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
