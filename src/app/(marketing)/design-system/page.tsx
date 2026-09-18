import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Icon } from "@/components/ui/icons";
import { ProgressBar, SkillList } from "@/components/ui/progress";
import { SectionHeading } from "@/components/ui/section-heading";
import { Stat } from "@/components/ui/stat";

export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const TOKENS = [
  ["--bg", "Fond de page"],
  ["--bg-elevated", "Fond de zone"],
  ["--surface", "Carte"],
  ["--surface-2", "Carte, niveau 2"],
  ["--surface-3", "Piste, hover"],
  ["--border", "Bordure"],
  ["--accent", "Accent mission"],
  ["--signal", "Signal contraintes"],
  ["--success", "Succès"],
  ["--danger", "Erreur"],
  ["--info", "Information"],
];

export default function DesignSystemPage() {
  return (
    <main id="contenu" className="container-x flex-1 space-y-16 py-14">
      <SectionHeading as="h1" eyebrow="Design system" title="Fondations MissionIA" description="Tokens sémantiques, typographie et composants de base. Sobre, premium, professionnel : aucune couleur criarde, un seul accent, un signal réservé aux contraintes." />

      <section aria-labelledby="ds-couleurs" className="space-y-4">
        <h2 id="ds-couleurs" className="h2">Couleurs</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TOKENS.map(([token, label]) => (
            <li key={token} className="card overflow-hidden">
              <div className="h-14 border-b border-border" style={{ background: `var(${token})` }} />
              <div className="p-3">
                <p className="mono-num text-xs">{token}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="ds-typo" className="space-y-4">
        <h2 id="ds-typo" className="h2">Typographie</h2>
        <Card className="space-y-4 p-6">
          <p className="eyebrow">Eyebrow · Geist Mono, capitales espacées</p>
          <p className="display">Display · titres de hero</p>
          <p className="h1">H1 · titre de page</p>
          <p className="h2">H2 · titre de section</p>
          <p className="h3">H3 · titre de carte</p>
          <p className="lead">Lead · chapeau de section, texte secondaire lisible.</p>
          <p>Corps de texte · Geist, 16px, interligne 1.55. Les chiffres importants utilisent <span className="mono-num">Geist Mono 30 000 €</span>.</p>
        </Card>
      </section>

      <section aria-labelledby="ds-boutons" className="space-y-4">
        <h2 id="ds-boutons" className="h2">Boutons</h2>
        <Card className="flex flex-wrap items-center gap-3 p-6">
          <Button>Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="danger">Destructif</Button>
          <Button disabled>Désactivé</Button>
          <Button size="sm">Petit</Button>
          <Button size="lg" trailingIcon={<Icon name="arrow-right" className="h-4 w-4" />}>
            Grand avec icône
          </Button>
          <ButtonLink href="/" variant="secondary">
            Lien stylé
          </ButtonLink>
        </Card>
      </section>

      <section aria-labelledby="ds-badges" className="space-y-4">
        <h2 id="ds-badges" className="h2">Badges et états</h2>
        <Card className="flex flex-wrap items-center gap-2 p-6">
          <Badge>Neutre</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Succès</Badge>
          <Badge tone="signal">Contrainte</Badge>
          <Badge tone="danger">Erreur</Badge>
          <Badge tone="info">Info</Badge>
        </Card>
      </section>

      <section aria-labelledby="ds-form" className="space-y-4">
        <h2 id="ds-form" className="h2">Formulaires</h2>
        <Card className="grid gap-5 p-6 md:grid-cols-2">
          <Field id="ds-titre" label="Titre de la mission" required hint="Formulez la mission comme un défi professionnel.">
            {(p) => <Input {...p} placeholder="48 heures pour lancer le produit" />}
          </Field>
          <Field id="ds-niveau" label="Niveau">
            {(p) => (
              <Select {...p} defaultValue="INTERMEDIATE">
                <option value="BEGINNER">Débutant</option>
                <option value="INTERMEDIATE">Intermédiaire</option>
                <option value="ADVANCED">Avancé</option>
                <option value="EXPERT">Expert</option>
              </Select>
            )}
          </Field>
          <Field id="ds-budget" label="Budget maximum" error="Le budget doit être un nombre positif.">
            {(p) => <Input {...p} defaultValue="-5" inputMode="numeric" />}
          </Field>
          <Field id="ds-contexte" label="Contexte">
            {(p) => <Textarea {...p} placeholder="Une entreprise B2B prépare le lancement d'un nouveau produit…" />}
          </Field>
        </Card>
      </section>

      <section aria-labelledby="ds-feedback" className="space-y-4">
        <h2 id="ds-feedback" className="h2">Alertes et feedback</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Alert tone="info" title="Information">Le coach IA est activé pour cette mission.</Alert>
          <Alert tone="success" title="Réussite">Votre ciblage est cohérent avec les données analysées.</Alert>
          <Alert tone="warning" title="Alerte contrainte">Votre proposition dépasse le budget disponible de 8 000 €.</Alert>
          <Alert tone="danger" title="Erreur">Le fichier dépasse la taille maximale de 20 Mo.</Alert>
        </div>
      </section>

      <section aria-labelledby="ds-progress" className="space-y-4">
        <h2 id="ds-progress" className="h2">Progression, compétences, indicateurs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4 p-6">
            <ProgressBar value={80} label="Progression de la mission" />
            <SkillList
              skills={[
                { name: "Analyse", state: "acquired" },
                { name: "Communication", state: "acquired" },
                { name: "Prise de décision", state: "in_progress" },
                { name: "Gestion budgétaire", state: "pending" },
              ]}
            />
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Complétion" value="88 %" hint="24 apprenants" />
            <Stat label="Score moyen" value="72" hint="sur 100" />
            <Stat label="Temps moyen" value="54 min" />
            <Stat label="Indices utilisés" value="1,4" hint="par apprenant" />
          </div>
        </div>
      </section>
    </main>
  );
}
