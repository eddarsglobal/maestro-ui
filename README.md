# MAESTRO UI — Guide de l'interface

**MAESTRO UI est l'interface de conversation de l'assistant local MAESTRO.** Elle est construite avec React, TypeScript et Vite. Le serveur local (Gateway) et le Core sont des projets séparés.

[← Guide complet pour débutants](https://github.com/eddarsglobal/maestro#readme) · [Gateway](https://github.com/eddarsglobal/maestro-gateway) · [Core](https://github.com/eddarsglobal/maestro)

> **Attention :** le dépôt public peut être moins avancé que la version locale de laboratoire. La présence d'une fonction dans une capture ne prouve pas qu'elle est disponible sur la branche `main`.

## À quoi sert l'interface ?

L'utilisateur écrit une question, lit la réponse, retrouve des conversations et configure les options disponibles. Le navigateur **ne doit pas** disposer d'une autorité directe sur les modèles, le système de fichiers ou les opérations sensibles. Les mécanismes internes d'orchestration n'ont pas à envahir la conversation.

## Pré-requis

- Git ;
- une version de **Node.js** et de **npm** compatible avec le `package.json` / `package-lock.json` du dépôt ;
- les dépôts frères `maestro-gateway` et `maestro` pour utiliser un véritable Gateway et ses fonctions.

Pour vérifier :

```bash
git --version
node --version
npm --version
```

Si une commande est absente, installez l'outil officiel avant de continuer.

## Installer l'interface — étape par étape

À partir d'un dossier nouveau :

```bash
mkdir -p "$HOME/MAESTRO"
cd "$HOME/MAESTRO"
git clone https://github.com/eddarsglobal/maestro-ui.git
cd maestro-ui
npm ci
```

La commande `npm ci` installe les dépendances décrites par le fichier de verrouillage. Elle a besoin d'un accès réseau pour une première installation.

**Ne supprimez pas un dossier MAESTRO existant pour recommencer.** Conservez vos changements locaux et demandez un diagnostic en cas d'échec.

## Construire la version utilisée par le Gateway

```bash
cd "$HOME/MAESTRO/maestro-ui"
npm run build
```

Le résultat est placé dans `dist/`. Pour le faire servir par le Gateway, lancez celui-ci avec :

```bash
MAESTRO_UI_DIST_DIR="$HOME/MAESTRO/maestro-ui/dist"
```

Cette variable doit faire partie de l'environnement du **processus Gateway** (voir son README), pas seulement être tapée dans une fenêtre sans lancer le serveur.

L'adresse attendue lorsque le Gateway est lancé sur le même ordinateur est **http://127.0.0.1:8787/app/**.

## Mode développement pour contributeurs

```bash
cd "$HOME/MAESTRO/maestro-ui"
npm run dev
```

Vite utilise habituellement un port de développement distinct du Gateway. Selon la configuration locale, il peut être nécessaire d'autoriser explicitement l'origine HTTP du développement. Ne mettez jamais une origine joker pour contourner un blocage.

Contrôles :

```bash
npm run build
npm run lint
```

Un build réussi prouve la compilation, **pas** la qualité du dialogue ni le fonctionnement des accès aux fichiers.

## Conversations et paramètres

Dans les versions qui l'implémentent, l'interface peut permettre de rechercher, copier, archiver, renommer ou supprimer des conversations. Les données de conversation sont différentes des journaux techniques. **Ne confondez pas « archiver » et « effacer définitivement ».**

Une réponse du modèle peut être incorrecte même si elle s'affiche normalement. Des sources doivent être affichées uniquement lorsqu'elles proviennent d'une véritable consultation et peuvent être vérifiées.

## Personnalisation et accessibilité

La direction de conception comprend :
- une interface lisible sur mobile et ordinateur ;
- les thèmes clair et sombre ;
- un état de traitement discret ;
- des actions de copie visibles ;
- une typographie et des barres de défilement adaptées au thème ;
- plusieurs langues (dont français, anglais, allemand, arabe, portugais, espagnol, croate et italien).

**Ce sont des exigences produit, pas une promesse que toutes les versions du dépôt public les réalisent intégralement.**

## Problèmes fréquents

| Problème | Solution de départ |
| --- | --- |
| `npm ci` échoue | Vérifiez Node/npm et la connexion ; gardez le message d'erreur |
| `npm run build` échoue | Consultez les erreurs TypeScript avant toute modification |
| Page blanche | Vérifiez les erreurs du navigateur et l'adresse `/app/` |
| Ancien design affiché | Rebuildez l'UI, vérifiez le `dist` réellement servi, rechargez sans cache |
| Conversations absentes | Vérifiez la connexion au Gateway ; ne supprimez pas les données |
| Aucune réponse | Vérifiez le Gateway **et** le moteur d'IA local, séparément |

## Contribuer

Consultez le [Core](https://github.com/eddarsglobal/maestro) pour les règles d'autorisation et le [Gateway](https://github.com/eddarsglobal/maestro-gateway) pour le transport. N'insérez aucune clé ni donnée privée dans le code ou une Issue publique.

## English summary

MAESTRO UI is the React/Vite frontend of the MAESTRO local assistant. Run `npm ci`, then `npm run build`; point the Local Gateway's `MAESTRO_UI_DIST_DIR` to the generated `dist` directory and open `http://127.0.0.1:8787/app/` on the same computer. This public repository may lag behind private/local development candidates; a successful UI build is not an end-to-end product certification.

**by [EddarsGlobal](https://github.com/eddarsglobal)**
