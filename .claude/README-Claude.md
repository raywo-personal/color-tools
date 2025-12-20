# Claude Skills & Agents - ATVANTAGE Academy

Dieses Repository enthält spezialisierte Skills und Agents für Claude Code, die
bei der Entwicklung und beim Trainingsdesign für die ATVANTAGE Academy
unterstützen.

## Enthaltene Skills

Skills werden automatisch von Claude Code erkannt und bei passenden Aufgaben
angewendet.

### Trainingsdesign (`skills/trainings-design.md`)

Ein Skill, der Claude bei der Erstellung und Planung von change-begleitenden
Trainings unterstützt.

**Kernprinzipien:**

- Breite vor Tiefe - Zusammenhänge vor Details
- Eigenverantwortlichkeit
- Hilfe zur Selbsthilfe
- Kein Lernen auf Vorrat
- Gemeinsames Lernen
- Freie Quellen vor eigenen Unterlagen
- Lernen braucht Sicherheit

**Verwendung:** Dieser Skill hilft bei der Erstellung von Trainingsinhalten und
Trainerleitfäden nach den etablierten Qualitätskriterien der ATVANTAGE Academy.

### Angular Development (`skills/angular-development.md`)

Ein Skill für die Entwicklung moderner Angular-Anwendungen mit TypeScript.

**Schwerpunkte:**

- Angular v20+ Best Practices
- Standalone Components
- Signal-basiertes State Management
- Accessibility (WCAG AA Standards)
- TypeScript Strict Mode
- Modern Control Flow Syntax

**Verwendung:** Dieser Skill gewährleistet die Einhaltung moderner
Angular-Entwicklungsstandards und Accessibility-Anforderungen.

### ATVANTAGE Design System (`skills/atvantage-design.md`)

Ein Skill für die konsistente Anwendung des ATVANTAGE Design-Systems.

**Schwerpunkte:**

- ATVANTAGE Bootstrap Integration
- Farbpalette und Typografie (Outfit, Inter, Chivo Mono)
- Layout-Standards und Komponenten
- Accessibility (WCAG AA)
- Dark Mode Support

**Verwendung:** Dieser Skill stellt sicher, dass alle Web-Komponenten und Seiten
dem ATVANTAGE Brand-Design entsprechen.

## Enthaltene Agents

Agents sind spezialisierte Assistenten, die für komplexe Aufgaben eingesetzt
werden können.

### Angular App Creator (`agents/angular-app-creator.md`)

Ein spezialisierter Agent für die Erstellung von Angular-Anwendungen,
-Komponenten, -Services und -Modulen nach ATVANTAGE-Standards.

**Funktionen:**

- Erstellt Angular 21 Anwendungen mit Standalone Components
- Implementiert Signal-basiertes State Management
- Integriert ATVANTAGE Bootstrap Design System
- Gewährleistet Accessibility-Compliance
- Verwendet moderne Control Flow Syntax

**Verwendung:** Wird automatisch aktiviert, wenn neue Angular-Artefakte erstellt
werden sollen.

### ATVANTAGE Web Designer (`agents/atvantage-web-designer.md`)

Ein spezialisierter Agent für das Design und die Entwicklung von Web-Seiten nach
ATVANTAGE Design-Richtlinien.

**Funktionen:**

- Design-System-konforme Web-Komponenten
- Responsive Layouts mit ATVANTAGE Branding
- Accessibility-gerechte Implementierung
- Performance-optimierter Code
- Cross-Browser-Kompatibilität

**Verwendung:** Wird für UI-Design und Frontend-Entwicklung eingesetzt, die den
ATVANTAGE-Standards entsprechen muss.

## Verwendung mit Claude Code

Diese Skills werden automatisch von Claude Code erkannt, wenn das Repository im
Arbeitsverzeichnis geöffnet ist. Claude nutzt die Skills kontextabhängig, um
qualitativ hochwertige Ergebnisse zu liefern.

## Verwendung in eigenen Projekten

Dieses Repository enthält wiederverwendbare Skills und Agents für Claude Code.

### Integration als Git Submodule

Um diese Skills und Agents in einem eigenen Projekt zu verwenden, füge dieses 
Repository als Git Submodule im `.claude/` Verzeichnis hinzu:

```bash                                                                                                                                                                                                                    
# Im Root-Verzeichnis deines Projekts ausführen:                                                                                                                                                                           
git submodule add timetoact@timetoact.ghe.com:AVD-Academy-Tools/ai-agents-context.git .claude                                                                                                                              
```                                                                                                                                                                                  
Nach dem Hinzufügen wird Claude Code automatisch die Skills und Agents aus 
diesem Submodule erkennen und nutzen.           

## Struktur dieses Repositorys

```
.claude/
├── agents/
│   ├── angular-app-creator.md       # Agent für Angular-App-Entwicklung
│   └── atvantage-web-designer.md    # Agent für Web-Design
└── skills/
    ├── trainings-design.md          # Skill für Trainingsdesign
    ├── angular-development.md       # Skill für Angular-Entwicklung
    └── atvantage-design.md          # Skill für ATVANTAGE Design-System
```

### In deinem Projekt

Nach der Integration als Submodule sieht die Struktur in deinem Projekt so aus:

```
dein-projekt/                                                                                                                                                                                                              
├── .claude/                    # Git Submodule                                                                                                                                                                            
│   ├── agents/                                                                                                                                                                                                            
│   │   ├── angular-app-creator.md                                                                                                                                                                                         
│   │   └── atvantage-web-designer.md                                                                                                                                                                                      
│   └── skills/                                                                                                                                                                                                            
│       ├── trainings-design.md                                                                                                                                                                                            
│       ├── angular-development.md                                                                                                                                                                                         
│       └── atvantage-design.md                                                                                                                                                                                            
├── src/                                                                                                                                                                                                                   
└── ...
```

## Lizenz

Dieses Projekt ist für die interne Verwendung bei der ATVANTAGE Academy
vorgesehen.
