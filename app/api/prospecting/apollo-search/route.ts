import { NextRequest } from "next/server";

export const maxDuration = 60;

const ENDPOINT = "https://api.apollo.io/api/v1/mixed_people/api_search";

export async function POST(req: NextRequest) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "APOLLO_API_KEY not configured" }, { status: 500 });
  }

  const body = await req.json();
  const {
    person_titles = [],
    q_organization_keyword_tags = [],
    person_locations = [],
    organization_num_employees_ranges = [],
    q_organization_job_titles = [],
    page = 1,
    per_page = 25,
  } = body;

  const apolloPayload: Record<string, unknown> = { page, per_page };
  if (person_titles.length > 0) apolloPayload.person_titles = person_titles;
  if (q_organization_keyword_tags.length > 0) apolloPayload.q_organization_keyword_tags = q_organization_keyword_tags;
  if (person_locations.length > 0) apolloPayload.person_locations = person_locations;
  if (organization_num_employees_ranges.length > 0) apolloPayload.organization_num_employees_ranges = organization_num_employees_ranges;
  if (q_organization_job_titles.length > 0) apolloPayload.q_organization_job_titles = q_organization_job_titles;

  console.log("[apollo-search] →", ENDPOINT);
  console.log("[apollo-search] payload →", JSON.stringify(apolloPayload, null, 2));
  console.log("[apollo-search] key prefix →", apiKey.slice(0, 6) + "…");

  const apolloRes = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(apolloPayload),
  });

  const rawText = await apolloRes.text();
  console.log("[apollo-search] status →", apolloRes.status);
  console.log("[apollo-search] response →", rawText.slice(0, 500));

  if (!apolloRes.ok) {
    return Response.json(
      { error: `Apollo ${apolloRes.status}`, detail: rawText, status: apolloRes.status },
      { status: apolloRes.status }
    );
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawText);
  } catch {
    return Response.json({ error: "parse_failed", raw: rawText.slice(0, 500) }, { status: 422 });
  }

  console.log("[apollo-search] pagination →", data.pagination);
  console.log("[apollo-search] people →", Array.isArray(data.people) ? data.people.length : "N/A");

  const people = Array.isArray(data.people) ? data.people : [];
  const leads = people.map((p: Record<string, unknown>) => {
    const org = (p.organization ?? {}) as Record<string, unknown>;
    return {
      id: p.id ?? "",
      name: p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(),
      title: p.title ?? "",
      company: (org.name ?? p.organization_name ?? "") as string,
      linkedin_url: p.linkedin_url ?? "",
      email: p.email ?? "",
      email_status: p.email_status ?? "",
    };
  });

  return Response.json({
    leads,
    pagination: data.pagination ?? {},
    total: (data.pagination as Record<string, unknown>)?.total_entries ?? leads.length,
  });
}
