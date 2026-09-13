# Changelog

Toutes les évolutions notables d'`agentic-agnostic-kit` sont consignées ici (format [Keep a Changelog](https://keepachangelog.com/), versioning [SemVer](https://semver.org/)).

## [1.3.0] — 2026-09-13

### Ajouté

- Support natif des **Éditeurs IA** (Cursor, Windsurf, Cline, GitHub Copilot). Leurs stubs projets (`.cursorrules`, `.windsurfrules`, etc.) sont générés et pointent vers l'écosystème global `AGENTS.md`.
- **Option Node.js pour le hook SessionStart**. Le wizard propose désormais le moteur Node.js (100% universel, sans dépendance) comme alternative portable au bash classique (exigeant `jq` et `awk`), débloquant le support sous Windows / Docker Alpine.
- Intégration de Antigravity CLI (`agy`) au scope Projet (génération de `GEMINI.md`).

### Corrigé

- Changements pour assurer la compatibilité stricte `Node >= 18.0.0` (remplacement de `import ... with { type: 'json' }` par `fs.readFileSync`).
- Centralisation sécurisée des hooks `graphify` (migration du dossier `.opencode/skills/graphify` vers `.agents/skills/graphify` avec backup).

## [1.2.1] — 2026-09-08

### Modifié

- Refonte visuelle de la sortie d'`init` (Home + Project) : bannière encadrée, étapes numérotées `STEP n/N`, puces colorisées (`✓`/`⚠`/`·`), chemins affichés relativement au projet (`./…`) ou au HOME (`~/…`), et cadre de clôture avec le compte des changements + « Prochaines étapes ». Aucune nouvelle dépendance (picocolors seul, couleur auto-désactivée hors TTY / sous `NO_COLOR`). `doctor`/`uninstall` bénéficient du nouveau cadre de résumé partagé, leur sortie détaillée reste inchangée.

## [1.2.0] — 2026-09-08

### Ajouté

- **`init --scope project` gère l'initialisation de Graphify** (opt-in, interactif). Quand le CLI `graphify` est présent : propose de câbler OpenCode (`graphify install --platform opencode --project`, idempotent) et, si aucun graphe local n'existe, de lancer le build initial (`graphify .`, extraction AST, sans clé API). Quand le CLI est absent : propose de l'installer via `uv tool install graphifyy` si `uv` est disponible, sinon affiche la marche à suivre. `claude-code` reste exclu du câblage automatique (la commande native écrit dans `CLAUDE.md`, le stub projet du kit). En `--dry-run` chaque action est annoncée sans être exécutée ; en `--yes` le câblage OpenCode tourne, le build et l'installation du CLI sont sautés.
- `doctor --scope project` : lignes d'aide quand le graphe est absent ou le CLI non détecté.

## [1.1.0] — 2026-09-08

### Ajouté

- **Scaffold ADR en scope Projet** : `init --scope project` propose désormais systématiquement, s'il est absent, un dossier `ADRs/` avec un `README.md` gabarit (nomenclature `NNNN-short-kebab-title.md`, format Status / Context / Decision / Consequences) — au même titre que `ARCHIVES_R/README.md` et `Backlog.md`. L'emplacement est au choix : racine `ADRs/` (défaut, et défaut en mode `--yes`) ou `.agents/ADRs/`.
- Le contrat projet généré (`.agents/AGENTS.md`) gagne une section `[ADR]` : quand consigner une décision d'architecture, où, quelle nomenclature.

### Corrigé

- Suppression de liens morts vers des fichiers internes non publiés (fichiers de décision du dépôt de développement) dans le README, le CHANGELOG, la sortie de `init`/`doctor`, et les stubs/hooks générés chez l'utilisateur — ces fichiers ne sont jamais présents dans le tarball npm ni sur la machine de l'utilisateur.

## [1.0.0] — 2026-08-30

### Cassant (Breaking)

- **`gemini-cli` retiré du kit** : officiellement arrêté depuis le 18/06/2026, et constaté refusant l'authentification en usage réel. N'est plus détecté ni proposé par `init`/`doctor`. `uninstall` reste capable de nettoyer un hook `gemini-cli` posé par une version antérieure du kit.

### Ajouté

- **`agy` (Antigravity CLI)** devient l'agent du kit pour l'écosystème Google/Gemini : agent stub-only (mécanisme `native-instruction-file`, comme OpenCode), stub `~/.gemini/GEMINI.md`, aucun hook — la documentation officielle Antigravity (`PreToolUse`/`PostToolUse`/`PreInvocation`/`PostInvocation`/`Stop` via `hooks.json`, pas de `SessionStart`) ne recoupe pas le mécanisme de hook des autres agents, et le mécanisme le plus proche avait déjà échoué en test réel — le stub natif seul est retenu, sans supposition sur un hook non vérifié.
- Menu de sélection multi-agents au wizard (`selectMultiple`, `selectAgentSubset`) et flag `--agent <id1,id2,...>` : permet de choisir quel(s) agent(s) configurer plutôt que de traiter systématiquement tous les agents détectés.

## [0.3.0] — 2026-08-24

### Ajouté

- Flag `--verbose`/`-v` sur `init`/`uninstall` : par défaut, chaque changement proposé s'affiche en une ligne de statut claire (ex: "New file — will be created", "You've customized this file — review before confirming") plutôt que le diff brut complet ; `--verbose` restaure l'affichage détaillé.
- Sortie colorée (dépendance `picocolors` ajoutée — le kit passe de zéro-dépendance à sa première dépendance runtime, ~2 Ko, elle-même zéro-dépendance).
- `init`/`doctor` détectent maintenant la présence de `bash`/`awk`/`jq` (requis par le hook `SessionStart`, jamais installés par le kit) : avertissement explicite avant génération du hook si l'un manque, plutôt que de laisser le hook échouer silencieusement à chaque démarrage de session. README (EN+FR) enrichi des commandes d'installation par gestionnaire de paquets (brew/apt/dnf/pacman) et d'une clarification sur le shell interactif (bash vs zsh, pas forcément les deux) vs le binaire `bash` requis par le hook.
- Section "Graphify integration" dans le README (EN+FR) : documente le mécanisme réel (détection, aide au setup, section `[GRAPHIFY]` du contrat, auto-sync cross-agent dans le hook projet) et son rôle pour un kit multi-agent.

### Modifié

- Toutes les sorties du CLI (`init`, `doctor`, `uninstall`, `--help`, messages d'erreur) traduites en anglais — cohérent avec les templates générés déjà traduits en 0.2.4 (auparavant : CLI en français, contenu généré en anglais).
- `lineDiff` remplacé par un vrai diff séquentiel (LCS ligne à ligne) au lieu d'un diff par ensemble : les blocs `+`/`-` respectent maintenant l'ordre réel du fichier et ne dupliquent plus les lignes communes entre les deux blocs — la source d'un affichage de diff auparavant illisible/désordonné pour tout fichier multi-lignes modifié.
- Prompt du nom de skill produit plus explicite (exemple concret + validation kebab-case en boucle, au lieu d'accepter n'importe quelle chaîne au risque de casser le chemin de fichier généré).

### Corrigé

- `Ctrl+C` pendant une confirmation (`init`/`uninstall`) faisait planter le CLI avec une stack trace Node.js brute (`AbortError` non interceptée) au lieu d'un arrêt propre — repéré en conditions réelles lors d'un test d'installation sur un compte utilisateur distinct. Traite maintenant l'abandon comme une interruption volontaire et immédiate (rien n'est annulé de ce qui a déjà été appliqué), avec un message clair.

## [0.2.5] — 2026-08-24

### Corrigé

- Section Installation du README restructurée (EN + FR) : le widget "Install" par défaut de npmjs affiche `npm i agentic-agnostic-kit` sans `-g`, ce qui installe le paquet en local (`node_modules/.bin/`, hors `PATH`) plutôt que d'exposer la commande — piège désormais signalé explicitement, avec install globale (`-g`) et usage à la demande (`npx`) présentés comme deux options distinctes, séparées du premier lancement (`init --dry-run` puis `init`).

## [0.2.4] — 2026-08-24

### Ajouté

- Scaffold `Backlog.md` (create-if-absent) et section `[BACKLOG]` dans le contrat projet : numérotation `# N. <marqueur>` avec statut mis à jour en place (`DONE`, `IN PROGRESS`, ...), pour consigner les idées en attente sans les perdre en conversation.
- Support du répertoire `ARCHIVES_R` et des règles d'archivage des études fonctionnelles/plans validés dans le kit (contrat global et projet).
- Détection de Graphify CLI et du graphe local (`graphify-out/`) pendant `init --scope project`, avec message d'aide contextuel si le CLI ou le graphe est absent (installation, build initial, précision sur la clé API optionnelle).
- Auto-alignement inter-agents Graphify (`opencode`/`antigravity`) dans le hook `SessionStart` projet.
- Commande raccourcie `agentic-agnostic` (alias : `agentic-agnostic-kit`, conservé pour compatibilité avec les installs existantes).

### Modifié

- Factorisation du pattern create-if-absent dans `init.js` (contrat global, contrat projet, `ARCHIVES_R`), au passage correction d'un message "déjà présent" qui n'affichait pas l'ownership pour `ARCHIVES_R`.
- Les 13 templates générés (contrats, stubs par agent, hooks `SessionStart`, scaffold de skill, `ARCHIVES_R/README.md`) sont désormais systématiquement en anglais, y compris le préambule injecté au démarrage de session. Une version FR/EN sélectionnable au wizard est planifiée séparément (cf. Backlog).

## [0.2.3] — 2026-08-23

### Corrigé

- Resynchronisation du README public sur npmjs (restructuration du titre, section Auteurs mise à jour, formatage Markdown).

## [0.2.2] — 2026-08-21

### Corrigé

- README nettoyé : retrait des liens vers des fichiers internes non publiés (absents du tarball npm, jamais accessibles depuis un package installé), retrait de la section "Publier une nouvelle version" (process mainteneur, hors sujet pour un utilisateur du package), retrait des exemples d'usage supposant le repo cloné (`node bin/cli.js`, `./run.sh`) au profit de la seule commande installée (`agentic-agnostic-kit`).

## [0.2.1] — 2026-08-21

### Corrigé

- Ajout du `package-lock.json` manquant (le pipeline CI échouait sur `npm ci` sans lockfile versionné).
- Chemin `bin` normalisé (`bin/cli.js` sans préfixe `./`).

## [0.2.0] — 2026-08-21

### Ajouté

- Scope **Projet** (`--scope project`) pour `init`/`doctor`/`uninstall` : contrat local (`.agents/AGENTS.md`), hook `SessionStart` dédié pour Claude Code/Gemini CLI (relaie toujours le contrat global en plus du contrat projet), scaffold de skill produit optionnel. Traite un seul projet (le dossier courant) par run.
- Support **OpenCode** (scope Home et Projet), via son mécanisme natif de chargement `AGENTS.md` — aucun hook ni configuration JSON requis pour cet agent.
- Commande **`uninstall`** : retire le câblage posé par le kit (entrée `hooks.SessionStart`, bloc marqué des stubs) sans jamais toucher au contrat, au script hook ou aux scaffolds de skill.
- `gemini-cli` marqué `(deprecated since 2026-06-18)` dans toutes les sorties du kit (Gemini CLI officiellement arrêté, successeur : Antigravity CLI — non intégré, mécanisme non reproductible à date).

## [0.1.0] — 2026-08-20

### Ajouté

- Première version : `init`/`doctor` scope **Home**, agents **Claude Code**, **Gemini CLI**, **Qwen-code** — hook `SessionStart` partagé, stub par agent pointant vers un contrat global `~/.agents/AGENTS.md`.
- Modèle de sécurité : toute écriture passe par preview → confirmation explicite → backup horodaté → écriture. Contenu résiduel non géré par le kit toujours préservé. Merge JSON par clé, jamais par écrasement de fichier entier. `--dry-run` disponible partout.
