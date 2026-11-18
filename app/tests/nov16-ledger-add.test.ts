import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NOV16_PHRASES } from "../src/lib/i18n/nov16-phrases";

const ledger = readFileSync("src/components/ledger-projects.tsx", "utf8");
const work = ledger.slice(ledger.indexOf("const work = myWork ?"), ledger.indexOf("// #44 expanded"));

describe("Nov 16 Ledger project ownership", () => {
  it("gates owned projects and the feed form within the member pipeline", () => {
    expect(ledger).toContain('import { canSeekOnProject } from "@/lib/project-seeking"');
    expect(work).toContain('!developer && canSeekOnProject(role) ? (');
    const owned = work.slice(work.indexOf('!developer && canSeekOnProject(role)'));
    expect(owned).toContain('data-testid="my-work-own-projects"');
    expect(owned).toContain('data.myProjects.map((project)');
    expect(owned).toContain('href={`/projects/${project.id}`}');
    expect(owned).toContain('<ReviewChip status={project.reviewStatus} />');
    expect(owned).toContain('id="ledger-add-project" data-testid="ledger-add-project"');
    expect(owned).toContain('open={openAdd || undefined}');
    expect(owned).toContain('<ProjectForm back="/feed" />');
    expect(owned).toContain('role === "GENERAL_CONTRACTOR"');
    expect(owned).toContain('w-full cursor-pointer list-none sm:w-auto');
  });

  it("uses project headings for project-owning profile roles", () => {
    const profile = readFileSync("src/components/profile-view.tsx", "utf8");
    expect(profile).toContain('member.role === "DEVELOPER" ? tx("My Projects") : canSeekOnProject(member.role) ? tx("My projects") : tx("Past work")');
  });

  it("provides Spanish, German and Japanese for every added label and hint", () => {
    const phrases = [
      "Your projects", "My projects", "No projects listed yet.", "Add a project",
      "Staff review each project. Once it is approved, open it from Your projects to post a trade bid package or create a Deal Room.",
      "Staff review each project. Once it is approved, open it from Your projects to create a Deal Room.",
    ];
    for (const phrase of phrases) {
      expect(NOV16_PHRASES[phrase], phrase).toHaveLength(3);
      for (const translation of NOV16_PHRASES[phrase]) {
        expect(translation.trim().length).toBeGreaterThan(0);
        expect(translation).not.toBe(phrase);
      }
      expect(phrase === "My projects" ? readFileSync("src/components/profile-view.tsx", "utf8") : work).toContain(`tx("${phrase}")`);
    }
  });
});
