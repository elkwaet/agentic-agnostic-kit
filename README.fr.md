# AGENTIC AGNOSTIC KIT

Ce framework est un wizard qui câble un contrat de comportement global (`~/.agents/AGENTS.md`)
et son injection au démarrage de session, sans jamais écraser silencieusement un contrat existant. Il est basé sur des expérimentations poussées et des conclusions empiriques issues des docu officielles et du comportement identifié des différents systemes Agentiques du marché, couverts. L'objectif est de disposer d'une centralisation de contrat sur un systeme (et à travers les projets) même quand l'opérateur/utilisateur doit switcher entre des sessions de travail "multi plateforme IA".

**ATTENTION: C'est purement orienté CLI / Pour les plateforme d'assistant coding en Terminal** .

## Installation

Le paquet npm s'appelle `agentic-agnostic-kit` ; la commande installée s'appelle `agentic-agnostic` (raccourci, l'ancien nom `agentic-agnostic-kit` reste disponible en alias).

> ⚠️ Le widget "Install" de NPMJS sur la page de ce paquet affiche `npm i agentic-agnostic-kit`, sans `-g`. Ça installe le paquet **en local** dans le dossier courant, pas globalement : la commande `agentic-agnostic` atterrit alors dans `node_modules/.bin/`, pas sur le `PATH` du shell — donc "command not found" si tu essaies de la lancer directement. Utilise plutôt une des deux options ci-dessous.

### 1. Installer

Pour une CLI utilisable depuis n'importe où sur ta machine, installe-la globalement avec `-g` :

```bash
npm install -g agentic-agnostic-kit
```

Tu préfères ne rien installer de façon permanente ? Lance-la à la demande, sans étape d'install, via `npx` :

```bash
npx agentic-agnostic-kit init --dry-run
```

### 2. Premier lancement

Une fois installé globalement, prévisualise ce que le wizard ferait sans rien écrire :

```bash
agentic-agnostic init --dry-run
```

Puis lance-le pour de vrai :

```bash
agentic-agnostic init
```

Par défaut, `init` traite tous les agents détectés sur la machine, avec un menu de sélection uniquement si plusieurs sont détectés (menu sauté avec `--yes`, qui garde toujours tout). Pour restreindre à des agents précis sans passer par le menu interactif, utilise `--agent` avec une liste séparée par des virgules :

```bash
agentic-agnostic init --agent agy
agentic-agnostic init --agent claude-code,opencode
```

`--agent` échoue explicitement (jamais un filtre silencieux) si un id est inconnu ou non détecté sur la machine.

### Installation locale dans un projet existant

Si tu installes le kit en local comme dépendance de projet (plutôt qu'en global avec `-g`), utilise le gestionnaire de paquets déjà en place dans ce projet, pas systématiquement `npm` :

```bash
pnpm add -D agentic-agnostic-kit   # projet pnpm (pnpm-lock.yaml present)
yarn add -D agentic-agnostic-kit   # projet yarn (yarn.lock present)
npm install agentic-agnostic-kit  # projet npm (package-lock.json present)
```

> Lancer un `npm install` dans un repertoire où le `node_modules/` a été construit par un autre gestionnaire (ex: pnpm, qui utilise des symlinks vers un store `.pnpm/`) peut faire planter `npm` avec une erreur du type `Cannot read properties of null (reading 'matches')` — c'est un bug connu de `npm`/`@npmcli/arborist` face à un arbre de dépendances qu'il n'a pas construit lui-même, pas un défaut de ce paquet. —

## Scope v1.0

- Agents supportés scope **Home** : **Claude Code, Qwen-code** (hook natif `SessionStart`) + **Antigravity CLI (`agy`)** et **OpenCode** (stub natif, aucun hook — chargent tous deux leur fichier d'instructions nativement au démarrage).
- Agents supportés scope **Projet** : **Claude Code uniquement** (précédence `project > Home` du hook `SessionStart` vérifiée) + **OpenCode** (stub natif `<projet>/AGENTS.md`, cumulé avec le stub Home — pas de précédence à arbitrer, les deux sont chargés). `qwen-code` et `agy` en sont exclus tant que leur précédence project/Home n'est pas vérifiée.
- **OpenCode** : intégré via son mécanisme natif de chargement de fichiers `AGENTS.md` — pas de plugin ni de configuration de permission nécessaire. Le **mécanisme** de chargement est fiable à 100% (lecture de fichier native, documentée par OpenCode) ; le **respect du contenu** par le modèle choisi dans OpenCode reste variable selon le modèle — pas un défaut du kit.
- **Gemini CLI est retiré du kit** (30/08/2026) : officiellement arrêté depuis le 18/06/2026, et constaté refusant l'authentification en usage réel. **Antigravity CLI (`agy`)** devient l'unique agent du kit pour l'écosystème Google/Gemini.

> NOTE : Antigravity CLI (`agy`) est intégré comme **agent à stub natif** (comme OpenCode) : le kit s'appuie sur la lecture native confirmée de `GEMINI.md`/`AGENTS.md` par `agy`, sans hook. La doc officielle Antigravity (`antigravity.google/docs/hooks`) documente un système de hooks différent (`PreToolUse`/`PostToolUse`/`PreInvocation`/`PostInvocation`/`Stop` via un fichier `hooks.json` — aucun événement `SessionStart` n'existe pour cet agent), et le test réel de ce mécanisme a échoué deux fois. Aucun hook n'est câblé pour `agy` tant qu'aucun n'est confirmé fonctionnel — le stub natif seul donne déjà à `agy` la même couverture de contrat qu'OpenCode.

### Scope Projet — points clés

- `init --scope project` traite **un seul projet (le dossier courant) par  run** — relance-le depuis n'importe quel autre dossier de projet à tout moment, il n'y a pas de mode batch multi-projets.
- Nécessite un contrat global (`~/.agents/AGENTS.md`) déjà en place : si absent, le wizard bloque et propose d'enchaîner sur le wizard Home dans la même session.
- Détecte le contrat projet local à la racine du dossier courant uniquement (`<cwd>/.agents/AGENTS.md`) — pas de remontée d'arborescence.
- Un hook `SessionStart` project-scope **remplace entièrement** (pas de merge) le hook Home pour ce projet : le hook généré relaie donc toujours le contrat global en plus du contrat projet, et un avertissement explicite est affiché avant confirmation.
- Skill produit optionnel : si aucun skill n'existe déjà sous `<cwd>/.agents/skills/`, le wizard propose un **scaffold vide** (nom fourni par l'utilisateur, zéro contenu généré par Q&A).
- Scaffolds de contenu créés s'ils sont absents : `ARCHIVES_R/README.md`, `Backlog.md`, et un dossier `ADRs/` (avec `README.md` gabarit) dont l'emplacement est au choix — racine `ADRs/` ou `.agents/ADRs/`. Le contrat projet généré inclut les sections `[ARCHIVES]`, `[ADR]` et `[BACKLOG]` correspondantes.
- Graphify : si le CLI `graphify` est présent, le wizard propose (opt-in) le câblage OpenCode et le build initial du graphe (`graphify .`, extraction AST, sans clé API) ; s'il est absent, il propose de l'installer via `uv tool install graphifyy` quand `uv` est disponible.

## Intégration Graphify

[Graphify](https://www.npmjs.com/package/graphifyy) est un CLI séparé et optionnel qui construit un **graphe de connaissances par projet** d'une codebase (AST uniquement, aucun appel LLM, aucune clé API requise pour l'usage de base) — il permet à un agent de demander "qu'est-ce qui appelle X", "quel est le plus court chemin entre A et B", ou d'obtenir une explication ciblée d'un symbole, plutôt que de grepper à l'aveugle ou de charger tout le repo en contexte. Il n'est pas embarqué dans ce kit et n'en est pas une dépendance ; `agentic-agnostic-kit` se contente de le **détecter, guider son installation, et le câbler** là où il est déjà présent. Concrètement, pendant `init --scope project` :

- **Détection** : le wizard vérifie si le CLI `graphify` est sur le `PATH` et si un graphe existe déjà sous `graphify-out/` dans le projet courant, et rapporte les deux.
- **Aide au setup** : si le CLI manque ou qu'aucun graphe n'existe encore, le wizard affiche les commandes exactes pour l'installer et construire le graphe initial — en précisant explicitement que le workflow de base (`graphify update .`, `graphify query`, `graphify path`, `graphify explain`) ne nécessite **aucune clé API** ; une clé n'est requise que pour le nommage de communautés via LLM ou l'ingestion de contenu non-code.
- **Section du contrat** : le contrat projet généré (`.agents/AGENTS.md`) inclut une section `[GRAPHIFY]` qui demande à l'agent d'interroger le graphe avant toute exploration large, et de le rafraîchir (`graphify update .`) après une modification de code structurellement significative.
- **Auto-sync cross-agent** : le hook `SessionStart` projet généré relance `graphify opencode/antigravity install --project` à chaque démarrage de session quand le CLI est présent — donc si tu mets à jour Graphify, ou travailles avec plusieurs agents IA sur le même projet, le câblage des plateformes sans mécanisme de hook natif reste à jour sans étape manuelle.

Pourquoi ça compte spécifiquement pour un kit **multi-agent** : chaque agent supporté par ce kit a sa propre fenêtre de contexte et sa propre façon par défaut de "se familiariser" avec une codebase (certains grep largement, d'autres lisent fichier par fichier). Un graphe de code partagé par projet donne à tous la même réponse factuelle et ciblée à "où ça vit et qu'est-ce que ça touche", peu importe quel agent pilote la session — une source de dérive spécifique-à-l'agent en moins, en complément du contrat de comportement partagé que ce kit centralise déjà.

## Compatibilité — Prérequis & OS

Testé sur macOS uniquement à ce stade. Ton **shell de connexion interactif** (bash sur la plupart des distributions Linux, zsh sur macOS moderne — souvent l'un ou l'autre, pas forcément les deux) **n'a pas d'importance** ici : le hook généré déclare son propre shebang (`#!/bin/bash`) et s'exécute comme sous-processus indépendant, jamais dans ton shell courant. Ce qui compte réellement, c'est que le **binaire** `bash` soit présent sur le `PATH`, peu importe le shell que tu utilises au quotidien — vrai par défaut sur macOS et quasiment toutes les distributions Linux, même quand zsh (ou fish, etc.) est ton shell de connexion.

**Prérequis système pour que le hook `SessionStart` fonctionne** (non installés par le kit — à avoir en place avant `init` ; `init` et `doctor` détectent et signalent ces trois outils, avec un avertissement si l'un manque, mais ne les installent jamais pour toi) :

- `bash`
- `awk` (extraction de la section `[PREAMBLE]` du contrat)
- `jq` (construction du JSON de sortie du hook)

Ces trois outils sont présents par défaut sur macOS et la plupart des distributions Linux desktop, mais pas garantis sur un Linux minimal (conteneur, serveur nu). Si `doctor` ou `init` signale qu'un outil manque, installe-le d'abord :

```bash
# macOS (Homebrew)
brew install bash awk jq   # awk (gawk/onetrueawk) est deja fourni par macOS, brew rarement necessaire

# Debian / Ubuntu
sudo apt install bash gawk jq

# Fedora / RHEL
sudo dnf install bash gawk jq

# Arch
sudo pacman -S bash gawk jq
```

| Environnement                     | Statut                                                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS (bash ou zsh)               | ✅ Testé, fonctionnel                                                                                                                                                                                                                 |
| Linux desktop courant             | ⚠️ Non testé, mécanisme identique à macOS — devrait fonctionner si `bash`/`awk`/`jq` présents                                                                                                                                         |
| WSL (Windows Subsystem for Linux) | ⚠️ Non testé. Probablement fonctionnel (environnement Linux réel) mais aucune validation faite — ne pas supposer que ça marche sans vérifier                                                                                          |
| Windows natif (sans WSL)          | ❌ Non supporté. La détection d'agents utilise le binaire Unix `which` (absent nativement, c'est `where.exe` avec une syntaxe différente), et le hook généré est un script bash (`#!/bin/bash`) sans équivalent PowerShell/cmd fourni |

Support Windows natif hors scope pour l'instant (nécessiterait une
détection cross-OS et un hook alternatif PowerShell) — pas prévu avant une
itération dédiée si la demande se présente.

## Usage

```bash
agentic-agnostic init --dry-run              # previsualise sans rien ecrire (scope home)
agentic-agnostic init                        # wizard interactif, confirmation par fichier
agentic-agnostic init --yes                   # accepte toutes les propositions (usage scripte)
agentic-agnostic init --scope project         # scope projet, depuis la racine du projet cible
agentic-agnostic init --scope project --dry-run
agentic-agnostic doctor                       # etat actuel scope home, lecture seule
agentic-agnostic doctor --scope project       # etat actuel scope projet (cwd), lecture seule
agentic-agnostic uninstall --dry-run          # previsualise le retrait du cablage (scope home)
agentic-agnostic uninstall --scope project    # retire le cablage scope projet (cwd)
```

Par défaut, chaque changement proposé s'affiche en une ligne de statut en langage clair (ex: "New file — will be created", "You've customized this file — review before confirming" — sorties CLI en anglais, cf. note ci-dessous). Passe `--verbose` (ou `-v`) à `init`/`uninstall` pour voir aussi le diff ligne à ligne complet :

```bash
agentic-agnostic init --dry-run --verbose
```

> Note : depuis la v0.3.0, les sorties du CLI (messages, prompts, labels) sont en anglais, cohérentes avec les templates générés (contrats, stubs, hooks) déjà traduits en 0.2.4. Seul ce README reste disponible en français.

### `uninstall`

Retire **uniquement le câblage** posé par le kit : l'entrée `hooks.SessionStart` dans les `settings.json` de chaque agent, et le bloc marqué dans les stubs (`CLAUDE.md`/`QWEN.md`, `GEMINI.md` pour Antigravity CLI, `AGENTS.md` pour OpenCode — Home ou Projet). OpenCode et Antigravity CLI n'ont pas d'entrée `hooks.SessionStart` à retirer (stub seul). `uninstall` nettoie aussi un hook `gemini-cli` laissé par une version du kit antérieure au 30/08/2026, même si `gemini-cli` n'est plus proposé par `init`/`doctor`.

Un stub qui ne contenait que le pointeur du kit est supprimé ; s'il contenait du contenu résiduel (ajouté après coup par l'utilisateur), seul le bloc marqué est retiré, le résidu est conservé tel quel.

Ne supprime **jamais automatiquement** le contrat `AGENTS.md`, le script hook, ni les scaffolds de skill — ce sont des fichiers de contenu que l'utilisateur fait évoluer, pas du câblage. `uninstall` les liste en fin d'exécution comme "toujours présents, non touchés" ; les retirer reste une action manuelle et délibérée.

## Modèle de sécurité

- Toute écriture passe par `FileOp` : lecture → diff → confirmation
  explicite → backup horodaté → écriture. Jamais d'écrasement direct.
- Ownership détecté par bloc marqué (`<!-- agentic-agnostic-kit:begin:... -->`)
  - hash de dernière écriture connue (`~/.agents/.agentic-agnostic-kit/state.json`).
    Contenu résiduel non géré par le kit (ex: un vrai `QWEN.md` avec des mémoires perso) est toujours préservé, jamais perdu.
- Merge JSON par clé, jamais par écrasement de fichier entier.
- `--dry-run` et exécution réelle partagent le même code (`FileOp.apply`).

## Tests

```bash
npm test
```

## Auteurs

- Elkwaet [Linkedin](https://linkedin.com/in/elkwaet) , [Gitlab: @elkwaet](https://gitlab.com/elkwaet)
- Prochains contributeurs 🤕 XOXO.

## Licence

[MIT](./LICENSE)
