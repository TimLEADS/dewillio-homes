import type { Metadata } from "next";
import { CreateLeadForm } from "@/components/admin/CreateLeadForm";
import { Card, Container } from "@/components/ui";

export const metadata: Metadata = { title: "New Lead — Dewilio Homes Admin" };

export default async function AdminNewLeadPage() {
  return (
    <Container className="!px-0">
      <h1 className="font-serif text-2xl font-bold text-brand-950">Create Lead</h1>
      <p className="mt-1 text-sm text-brand-500">
        Add a qualified opportunity. Enable auto-assign to match the best eligible agent automatically.
      </p>
      <Card className="mt-6">
        <CreateLeadForm />
      </Card>
    </Container>
  );
}
