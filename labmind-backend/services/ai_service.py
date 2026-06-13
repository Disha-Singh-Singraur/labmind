"""
LabMind AI Service
Handles all OpenAI interactions with realistic mock fallbacks.
Switch USE_REAL_AI=true in .env to enable live OpenAI calls.
"""
import json
import os
from typing import Any, Dict, List

from dotenv import load_dotenv

load_dotenv()

USE_REAL_AI = os.getenv("USE_REAL_AI", "false").lower() == "true"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_client = None

if USE_REAL_AI:
    try:
        from openai import AsyncOpenAI
        _client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    except ImportError:
        USE_REAL_AI = False


# ---------------------------------------------------------------------------
# MOCK DATA — realistic titration experiment for demo purposes
# ---------------------------------------------------------------------------

MOCK_GEL_ELECTROPHORESIS = {
    "name": "DNA Gel Electrophoresis: Fragment Size Estimation",
    "objective": (
        "Separate DNA fragments by size on a 1% agarose gel using an electric field, "
        "and estimate the length of an unknown DNA fragment by comparing its migration "
        "distance to a DNA ladder using semi-log analysis."
    ),
    "materials": [
        "Agarose powder (0.5 g per gel)",
        "1× TAE buffer (500 mL)",
        "DNA samples (unknown + control, 20 µL each)",
        "6× DNA loading dye (blue/orange)",
        "100 bp DNA ladder (GeneRuler)",
        "Horizontal gel electrophoresis chamber",
        "DC power supply (100–120 V)",
        "UV transilluminator or blue-light gel imager",
        "Gel casting tray + comb (8-well)",
        "Microwave or hot plate",
        "Conical flask (250 mL)",
        "Micropipette (2–20 µL) + tips",
        "Nitrile gloves",
        "UV-protective goggles",
        "SYBR Safe DNA gel stain (10,000× in DMSO)",
    ],
    "safety_notes": [
        "UV light causes retinal and skin damage — always wear UV-protective goggles when using a transilluminator",
        "SYBR Safe is a safer alternative to ethidium bromide; if EtBr is used it is highly mutagenic — dispose as hazardous waste",
        "Hot agarose (>60°C) causes severe burns — allow to cool to ~55°C before pouring",
        "Electric current in the electrophoresis tank is lethal — never open the chamber lid while power is on",
        "Wear nitrile gloves throughout to prevent DNA contamination and stain exposure",
    ],
    "steps": [
        {
            "step_number": 1,
            "title": "Prepare TAE Buffer",
            "description": "Measure 500 mL of 1× TAE buffer using a graduated cylinder and pour it into a clean reservoir bottle.",
            "why": "TAE maintains a stable pH and provides the ionic environment needed for DNA migration; incorrect concentration alters band sharpness.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 2,
            "title": "Weigh Agarose",
            "description": "Weigh 0.5 g of agarose powder on an analytical balance and transfer it to a 250 mL conical flask.",
            "why": "0.5 g in 50 mL TAE gives exactly 1% agarose — the optimal concentration for separating 100–2000 bp fragments.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 3,
            "title": "Add TAE to Agarose",
            "description": "Add exactly 50 mL of 1× TAE buffer to the conical flask containing the agarose powder.",
            "why": "The buffer dissolves the agarose and will form the gel matrix after heating; the ratio determines gel percentage.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 4,
            "title": "Melt Agarose",
            "description": "Microwave the flask on high in 30-second bursts, swirling between each, until the solution is completely clear with no undissolved particles.",
            "why": "Undissolved agarose particles create uneven gel density, causing distorted bands that cannot be accurately measured.",
            "safety_warning": "Flask becomes very hot — use heat-resistant gloves. Agarose can superheat and boil over without warning.",
            "checkpoint_required": False,
        },
        {
            "step_number": 5,
            "title": "Add SYBR Safe Stain",
            "description": "Cool the flask to ~55°C (comfortably warm to touch), then add 5 µL of 10,000× SYBR Safe stain and swirl gently to mix.",
            "why": "Adding stain at 55°C prevents premature solidification while avoiding stain degradation from excessive heat; SYBR Safe intercalates into DNA for UV/blue-light visualization.",
            "safety_warning": "Do not add stain to boiling agarose — this degrades the stain. Wear gloves.",
            "checkpoint_required": False,
        },
        {
            "step_number": 6,
            "title": "Assemble Casting Tray",
            "description": "Place the gel casting tray on a level surface, insert the 8-well comb 1 cm from one end, and seal the ends with tape or rubber dams.",
            "why": "A level tray ensures uniform gel thickness; the comb creates wells for sample loading; sealed ends prevent the liquid agarose from flowing out.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 7,
            "title": "Pour the Gel",
            "description": "Slowly pour the 55°C agarose solution into the casting tray, filling to approximately 5 mm depth. Pop any bubbles with a pipette tip.",
            "why": "Air bubbles create voids in the gel matrix that distort band migration and cause inaccurate size estimates.",
            "safety_warning": "Hot agarose causes burns — pour carefully and avoid splashing.",
            "checkpoint_required": False,
        },
        {
            "step_number": 8,
            "title": "Allow Gel to Solidify",
            "description": "Leave the gel undisturbed at room temperature for 20–30 minutes until it is completely opaque and firm to the touch.",
            "why": "Disturbing the gel during solidification creates uneven density zones that distort electrophoretic separation.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 9,
            "title": "Set Up Electrophoresis Chamber",
            "description": "Remove the comb and tape, place the solidified gel in the electrophoresis tank with wells closest to the negative (black) electrode, and fill with 1× TAE until gel is submerged by ~2–3 mm.",
            "why": "DNA is negatively charged, so it migrates from negative to positive electrode; wells must face the correct direction or samples run off the gel.",
            "safety_warning": "Ensure the power supply is OFF before handling the electrophoresis tank.",
            "checkpoint_required": True,
        },
        {
            "step_number": 10,
            "title": "Prepare DNA Samples",
            "description": "Mix 2 µL of each DNA sample with 2 µL of 6× loading dye in a microcentrifuge tube. Mix gently by pipetting. Prepare the DNA ladder similarly.",
            "why": "Loading dye adds density so samples sink into wells (not float away) and contains tracking dyes to visually monitor electrophoresis progress.",
            "safety_warning": "Use filter tips to prevent cross-contamination between samples.",
            "checkpoint_required": False,
        },
        {
            "step_number": 11,
            "title": "Load Samples into Wells",
            "description": "Pipette 10 µL of DNA ladder into lane 1, then 10 µL of each DNA sample into lanes 2–6. Submerge tip just inside the well opening before dispensing.",
            "why": "Consistent loading volume ensures comparable band intensity; gentle dispensing prevents puncturing the gel or mixing adjacent lanes.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 12,
            "title": "Run the Gel",
            "description": "Secure the lid, connect leads (red to red, black to black), set voltage to 100 V, and run for 40–45 minutes.",
            "why": "At 100 V, DNA migrates at a safe, reproducible rate; lower voltages reduce resolution, higher voltages cause band distortion from heat.",
            "safety_warning": "Never open the chamber lid while power is on — risk of electrocution.",
            "checkpoint_required": True,
        },
        {
            "step_number": 13,
            "title": "Verify Migration Progress",
            "description": "After 20 minutes, briefly pause power and check that the blue dye front (bromophenol blue) has migrated at least halfway across the gel.",
            "why": "The dye front tracks approximately the 300 bp fragment; halfway migration ensures adequate separation of bands above this size.",
            "safety_warning": "Switch OFF power completely before opening the lid.",
            "checkpoint_required": False,
        },
        {
            "step_number": 14,
            "title": "Visualize Bands",
            "description": "Stop the run, remove the gel, place it on the UV transilluminator or blue-light imager, and photograph the fluorescent DNA bands.",
            "why": "SYBR Safe fluoresces when bound to double-stranded DNA under UV/blue light, revealing band positions for size estimation.",
            "safety_warning": "Wear UV-protective goggles. Minimize UV exposure time to reduce DNA damage to samples and eyes.",
            "checkpoint_required": True,
        },
        {
            "step_number": 15,
            "title": "Measure and Record Band Positions",
            "description": "Measure the migration distance (in mm) of each ladder band and the unknown fragment from the well edge. Plot log(size) vs distance on semi-log paper to estimate the unknown fragment size.",
            "why": "DNA migration distance is linearly proportional to log(fragment size); the standard curve from the ladder allows accurate size interpolation.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
    ],
    "result_questions": [
        {
            "id": "q1",
            "question": "What was the migration distance of the unknown band? (mm)",
            "type": "number",
            "unit": "mm",
            "placeholder": "e.g. 32.0",
        },
        {
            "id": "q2",
            "question": "What was the migration distance of the nearest ladder band? (mm)",
            "type": "number",
            "unit": "mm",
            "placeholder": "e.g. 30.0",
        },
        {
            "id": "q3",
            "question": "What colour were the DNA bands under UV?",
            "type": "text",
            "unit": None,
            "placeholder": "e.g. green fluorescence",
        },
        {
            "id": "q4",
            "question": "Did all lanes show clear bands?",
            "type": "boolean",
            "unit": None,
            "placeholder": None,
        },
        {
            "id": "q5",
            "question": "Any additional observations?",
            "type": "textarea",
            "unit": None,
            "placeholder": "Describe anything unusual you noticed...",
        },
    ],
}

MOCK_IODINE_CLOCK = {
    "name": "Iodine Clock Reaction: Kinetics & Rate Determination",
    "objective": (
        "Measure the rate of a chemical reaction by timing the sudden blue-black colour change "
        "of the iodine clock reaction, then determine the rate constant (k) and reaction order "
        "by varying hydrogen peroxide concentration across multiple trials."
    ),
    "materials": [
        "Hydrogen peroxide (H₂O₂) solution, 3% (100 mL)",
        "Potassium iodate (KIO₃) solution, 0.04 M (100 mL)",
        "Sodium thiosulfate (Na₂S₂O₃) solution, 0.005 M (50 mL)",
        "Starch solution, 1% (20 mL)",
        "Sulfuric acid (H₂SO₄), 1 M (50 mL)",
        "Distilled water (500 mL)",
        "5× 100 mL beakers (labelled A and B)",
        "Measuring cylinders (10 mL, 25 mL, 50 mL)",
        "Stopwatch (resolution 0.01 s)",
        "Magnetic stirrer and stir bars",
        "Glass stirring rod",
        "Thermometer (0–100°C)",
        "White tile (for viewing colour change)",
        "Nitrile gloves and splash-proof goggles",
    ],
    "safety_notes": [
        "H₂O₂ (3%) is an oxidizing agent — keep away from organic materials and skin; rinse immediately with water if contacted",
        "H₂SO₄ is corrosive — causes severe burns; dilute by adding acid to water, never water to acid",
        "Wear splash-proof goggles and nitrile gloves for the entire experiment",
        "Work in a well-ventilated area — avoid inhaling any vapours",
        "Dispose of all solutions in the designated waste container; do not pour down the drain without neutralisation",
        "If any solution contacts eyes, flush with water for 15 minutes and seek medical attention immediately",
    ],
    "steps": [
        {
            "step_number": 1,
            "title": "Record Room Temperature",
            "description": "Measure and record the ambient temperature with the thermometer before preparing any solutions.",
            "why": "Reaction rate is temperature-dependent; recording baseline temperature allows corrections if conditions change between trials.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 2,
            "title": "Prepare Solution A (Trial 1)",
            "description": "In Beaker A, measure and combine: 10 mL of 0.04 M KIO₃ + 5 mL of 1 M H₂SO₄ + 35 mL distilled water. Label it Solution A.",
            "why": "Solution A contains the iodate oxidant and acid catalyst; precise volumes ensure reproducible initial concentrations for rate calculation.",
            "safety_warning": "Add H₂SO₄ carefully — it is corrosive. Wear gloves.",
            "checkpoint_required": True,
        },
        {
            "step_number": 3,
            "title": "Prepare Solution B (Trial 1)",
            "description": "In Beaker B, measure and combine: 10 mL of 3% H₂O₂ + 5 mL of 0.005 M Na₂S₂O₃ + 2 mL of 1% starch solution + 23 mL distilled water. Label it Solution B.",
            "why": "Solution B contains the reductant (thiosulfate) and starch indicator; the thiosulfate acts as a chemical clock — colour change occurs only when it is fully consumed.",
            "safety_warning": "H₂O₂ is an oxidizer — keep clear of flammables.",
            "checkpoint_required": True,
        },
        {
            "step_number": 4,
            "title": "Place Beakers on White Tile",
            "description": "Set both beakers side by side on a white tile in good lighting. Have the stopwatch ready.",
            "why": "The white background maximises contrast for detecting the sudden blue-black colour change, which indicates the clock endpoint.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 5,
            "title": "Start the Clock Reaction",
            "description": "Simultaneously pour Solution A into Beaker B and start the stopwatch. Swirl gently and continuously.",
            "why": "Simultaneous pour and timer start ensures the reaction time measurement begins exactly when the two solutions contact; gentle swirling ensures homogeneous mixing without introducing turbulence.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 6,
            "title": "Record Colour Change Time",
            "description": "Stop the stopwatch the instant the solution turns blue-black. Record the time (t₁) in seconds to 2 decimal places.",
            "why": "The blue-black colour signals that all thiosulfate has been consumed and free iodine is now reacting with starch; this time is the measurable endpoint of the clock mechanism.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 7,
            "title": "Calculate Trial 1 Rate",
            "description": "Calculate the reaction rate for Trial 1: Rate = 1/t₁. Record the value in your results table.",
            "why": "Rate is inversely proportional to time; 1/t gives a direct measure of how quickly reactants are consumed under these concentration conditions.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 8,
            "title": "Prepare Trial 2 (Half H₂O₂)",
            "description": "Rinse beakers with distilled water. Prepare Solution A identically. For Solution B, use 5 mL H₂O₂ + 28 mL distilled water (all other components unchanged).",
            "why": "Halving [H₂O₂] while keeping [KIO₃] constant isolates the effect of H₂O₂ concentration on rate; this is the controlled-variable approach for determining reaction order.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 9,
            "title": "Run Trial 2",
            "description": "Repeat steps 5–6: pour Solution A into B, start stopwatch immediately, and record the colour-change time (t₂).",
            "why": "Replication with a different concentration allows determination of whether doubling [H₂O₂] doubles the rate (first order) or quadruples it (second order).",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 10,
            "title": "Prepare Trial 3 (Quarter H₂O₂)",
            "description": "Rinse beakers. Prepare Solution B with 2.5 mL H₂O₂ + 30.5 mL distilled water (all other components unchanged). Solution A remains identical.",
            "why": "A third concentration data point is required for statistical confidence in the rate law; three points allow fitting a power-law model to determine the order.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 11,
            "title": "Run Trial 3",
            "description": "Repeat steps 5–6 for Trial 3. Record colour-change time (t₃) in seconds.",
            "why": "Three concordant trials across a dilution series provide sufficient data to determine reaction order with respect to H₂O₂ by log-log analysis.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 12,
            "title": "Tabulate All Results",
            "description": "Create a results table with columns: Trial, [H₂O₂] (mol/L), t (s), Rate = 1/t (s⁻¹). Fill in all three trials.",
            "why": "Systematic tabulation prevents transcription errors and makes the log-log plot straightforward to construct.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 13,
            "title": "Determine Reaction Order",
            "description": "Plot log(Rate) vs log([H₂O₂]). Draw the best-fit line and determine its gradient — this is the order of reaction with respect to H₂O₂.",
            "why": "If Rate = k[H₂O₂]ⁿ, then log(Rate) = n·log([H₂O₂]) + log(k); the gradient of the log-log plot directly gives n, the reaction order.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 14,
            "title": "Calculate Rate Constant k",
            "description": "Use any trial's data: rearrange Rate = k[H₂O₂]ⁿ to find k = Rate / [H₂O₂]ⁿ. Average k across all three trials.",
            "why": "Averaging k over multiple trials reduces random experimental error; a consistent k confirms the rate law is correct.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 15,
            "title": "Clean Up and Dispose",
            "description": "Neutralise all acid solutions by adding sodium bicarbonate until effervescence stops, then dispose in the designated waste container. Rinse all glassware three times with distilled water.",
            "why": "Neutralisation makes solutions safe for drain disposal; triple rinsing prevents contamination of future experiments.",
            "safety_warning": "Add sodium bicarbonate slowly to avoid vigorous foaming. Wear gloves until all glassware is rinsed.",
            "checkpoint_required": False,
        },
    ],
    "result_questions": [
        {
            "id": "q1",
            "question": "How long did the colour change take at concentration 1? (seconds)",
            "type": "number",
            "unit": "s",
            "placeholder": "e.g. 45.2",
        },
        {
            "id": "q2",
            "question": "How long at concentration 2? (seconds)",
            "type": "number",
            "unit": "s",
            "placeholder": "e.g. 90.5",
        },
        {
            "id": "q3",
            "question": "How long at concentration 3? (seconds)",
            "type": "number",
            "unit": "s",
            "placeholder": "e.g. 180.1",
        },
        {
            "id": "q4",
            "question": "Describe the colour change you observed",
            "type": "text",
            "unit": None,
            "placeholder": "e.g. colorless to dark blue",
        },
        {
            "id": "q5",
            "question": "Did the reaction behave as expected?",
            "type": "boolean",
            "unit": None,
            "placeholder": None,
        },
        {
            "id": "q6",
            "question": "Any additional observations?",
            "type": "textarea",
            "unit": None,
            "placeholder": "Describe anything unusual you noticed...",
        },
    ],
}

MOCK_EXPERIMENT = {
    "name": "Acid-Base Titration: Determination of NaOH Concentration",
    "objective": (
        "To determine the unknown concentration of a sodium hydroxide (NaOH) solution by "
        "performing a titration with a standardized hydrochloric acid (HCl) solution, and to "
        "calculate the molarity using stoichiometric relationships."
    ),
    "materials": [
        "50 mL burette",
        "250 mL Erlenmeyer flask",
        "Magnetic stirrer and stir bar",
        "25 mL volumetric pipette",
        "Phenolphthalein indicator solution",
        "0.1 M HCl standard solution (100 mL)",
        "Unknown NaOH solution (100 mL)",
        "Distilled water",
        "Burette clamp and retort stand",
        "White background paper",
        "Safety goggles",
        "Lab coat",
        "Nitrile gloves",
    ],
    "safety_notes": [
        "Wear safety goggles, lab coat, and nitrile gloves throughout the entire experiment",
        "HCl is corrosive — handle with care and avoid contact with skin and eyes",
        "NaOH is caustic and can cause chemical burns — rinse immediately with water if contacted",
        "Work in a well-ventilated area at all times",
        "Dispose of all acid/base waste in the designated neutralisation waste container",
        "In case of eye contact, use the eyewash station immediately for a minimum of 15 minutes",
    ],
    "steps": [
        {
            "step_number": 1,
            "title": "Rinse the Burette",
            "description": "Rinse the burette three times with small amounts (~5 mL) of 0.1 M HCl standard solution.",
            "why": "Removes residual water or contaminants that could dilute the standard acid and skew volume measurements.",
            "safety_warning": "Handle HCl with care — it is a strong acid. Wear gloves during all burette operations.",
            "checkpoint_required": False,
        },
        {
            "step_number": 2,
            "title": "Clamp the Burette",
            "description": "Clamp the burette vertically to the retort stand.",
            "why": "Ensures the burette is aligned correctly so the meniscus can be read horizontally without parallax errors.",
            "safety_warning": "Ensure the clamp is secure but not overtightened to avoid cracking the glassware.",
            "checkpoint_required": True,
        },
        {
            "step_number": 3,
            "title": "Fill the Burette",
            "description": "Fill the burette with 0.1 M HCl standard solution to slightly above the 0.00 mL mark.",
            "why": "Provides surplus solution to expel bubbles and adjust exactly to the zero mark.",
            "safety_warning": "Use a funnel to fill. Do not lift standard solutions above eye level when pouring.",
            "checkpoint_required": False,
        },
        {
            "step_number": 4,
            "title": "Expel Air Bubbles",
            "description": "Open the stopcock fully for a brief moment to expel any air bubbles trapped in the burette tip.",
            "why": "An air bubble escaping during titration would falsely increase the recorded volume reading.",
            "safety_warning": "Collect the expelled acid in a waste beaker.",
            "checkpoint_required": False,
        },
        {
            "step_number": 5,
            "title": "Adjust to Zero Mark",
            "description": "Slowly release acid until the bottom of the meniscus is aligned exactly with the 0.00 mL mark.",
            "why": "Establishes a standardized, clean zero baseline for start measurements.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 6,
            "title": "Measure NaOH Analyte",
            "description": "Use a 25 mL volumetric pipette with a safety pipette bulb to draw exactly 25.00 mL of unknown NaOH solution.",
            "why": "Provides a precise, fixed quantity of the base analyte for concentration calculations.",
            "safety_warning": "NaOH is caustic. Always use a pipette bulb — never pipette by mouth.",
            "checkpoint_required": False,
        },
        {
            "step_number": 7,
            "title": "Transfer NaOH Analyte",
            "description": "Transfer the 25.00 mL NaOH solution from the pipette into a clean, dry 250 mL Erlenmeyer flask.",
            "why": "The conical shape of the flask allows rapid swirling without spilling during titration.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 8,
            "title": "Add Dilution Water",
            "description": "Add approximately 50 mL of distilled water to the Erlenmeyer flask.",
            "why": "Increases the solution volume to make the color change easier to see; does not change the number of moles of NaOH.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 9,
            "title": "Position Stirring Setup",
            "description": "Add a clean magnetic stir bar to the flask and position it on the magnetic stirrer.",
            "why": "Continuous mixing ensures immediate reaction when acid meets base, making the endpoint visible instantly.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 10,
            "title": "Add Indicator",
            "description": "Add 3–4 drops of phenolphthalein indicator solution to the Erlenmeyer flask. The solution will turn pink.",
            "why": "Phenolphthalein is a pH indicator that is pink in basic environments (pH > 8.2), indicating base is present.",
            "safety_warning": None,
            "checkpoint_required": True,
        },
        {
            "step_number": 11,
            "title": "Set White Background",
            "description": "Place a clean sheet of white paper directly beneath the flask.",
            "why": "A white background improves contrast, letting you spot the first permanent pale pink endpoint easily.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 12,
            "title": "Perform Rough Titration",
            "description": "Position the flask under the burette, start the stirrer, and add HCl in a steady stream. Stop when pink fades permanently.",
            "why": "Quickly estimates the approximate equivalence point volume (V_rough) to speed up subsequent accurate trials.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 13,
            "title": "Perform Accurate Titration",
            "description": "Refill burette to 0.00 mL. Repeat titration dropwise (1 drop/3s) when within 2 mL of V_rough. Stop at the first permanent pale pink.",
            "why": "Allows pinpointing the exact equivalence point (pale pink lasting 30+ seconds) without overshooting.",
            "safety_warning": "Patience is required. Overshooting (bright persistent pink) invalidates the trial.",
            "checkpoint_required": True,
        },
        {
            "step_number": 14,
            "title": "Collect Concordant Readings",
            "description": "Perform the accurate titration at least two more times until you get 3 concordant readings (within 0.10 mL).",
            "why": "Ensures statistical reliability and precision by taking the average of closely matching trials.",
            "safety_warning": None,
            "checkpoint_required": False,
        },
        {
            "step_number": 15,
            "title": "Clean Up & Neutralize",
            "description": "Rinse burette and glassware with distilled water, neutralize waste before dumping, and wash hands thoroughly.",
            "why": "Leaves a clean laboratory environment and safely disposes of corrosive reagents.",
            "safety_warning": "Never pour strong acids/bases down the drain. Use the neutralization waste container.",
            "checkpoint_required": False,
        },
    ],
    "result_questions": [
        {
            "id": "q1",
            "question": "What was your initial burette reading?",
            "type": "number",
            "unit": "ml",
            "placeholder": "e.g. 0.00",
        },
        {
            "id": "q2",
            "question": "What was your rough titre reading?",
            "type": "number",
            "unit": "ml",
            "placeholder": "e.g. 24.90",
        },
        {
            "id": "q3",
            "question": "What was your first accurate titre?",
            "type": "number",
            "unit": "ml",
            "placeholder": "e.g. 24.60",
        },
        {
            "id": "q4",
            "question": "What was your second accurate titre?",
            "type": "number",
            "unit": "ml",
            "placeholder": "e.g. 24.65",
        },
        {
            "id": "q5",
            "question": "What colour did the solution turn at the endpoint?",
            "type": "text",
            "unit": None,
            "placeholder": "e.g. pale pink",
        },
        {
            "id": "q6",
            "question": "Were your concordant readings within 0.1ml of each other?",
            "type": "boolean",
            "unit": None,
            "placeholder": None,
        },
        {
            "id": "q7",
            "question": "Any additional observations?",
            "type": "textarea",
            "unit": None,
            "placeholder": "Describe anything unusual you noticed...",
        },
    ],
}

# ---------------------------------------------------------------------------
# PRELOADED EXPERIMENT CATALOG
# Metadata for the Quick Start feature — not tied to any DB user
# ---------------------------------------------------------------------------

PRELOADED_EXPERIMENTS = [
    {
        "id": 1,
        "name": "Acid-Base Titration",
        "subject": "Chemistry",
        "difficulty": "Beginner",
        "duration_minutes": 45,
        "step_count": 15,
        "objective": MOCK_EXPERIMENT["objective"],
        "materials": MOCK_EXPERIMENT["materials"],
        "safety_notes": MOCK_EXPERIMENT["safety_notes"],
        "template_key": "titration",
    },
    {
        "id": 2,
        "name": "DNA Gel Electrophoresis",
        "subject": "Biology",
        "difficulty": "Intermediate",
        "duration_minutes": 90,
        "step_count": 15,
        "objective": MOCK_GEL_ELECTROPHORESIS["objective"],
        "materials": MOCK_GEL_ELECTROPHORESIS["materials"],
        "safety_notes": MOCK_GEL_ELECTROPHORESIS["safety_notes"],
        "template_key": "gel_electrophoresis",
    },
    {
        "id": 3,
        "name": "Iodine Clock Reaction",
        "subject": "Kinetics",
        "difficulty": "Advanced",
        "duration_minutes": 60,
        "step_count": 15,
        "objective": MOCK_IODINE_CLOCK["objective"],
        "materials": MOCK_IODINE_CLOCK["materials"],
        "safety_notes": MOCK_IODINE_CLOCK["safety_notes"],
        "template_key": "iodine_clock",
    },
]

PRELOADED_TEMPLATE_MAP: Dict[str, Dict[str, Any]] = {
    "titration": MOCK_EXPERIMENT,
    "gel_electrophoresis": MOCK_GEL_ELECTROPHORESIS,
    "iodine_clock": MOCK_IODINE_CLOCK,
}


MOCK_VERIFY_RESPONSE = {
    "feedback": (
        "Lab setup appears correct for this stage of the titration. The burette is properly "
        "clamped in a vertical position with no visible air bubbles in the tip or stopcock area. "
        "The Erlenmeyer flask is correctly positioned beneath the burette with the stir bar visible. "
        "The solution shows an appropriate pink colouration consistent with phenolphthalein in "
        "alkaline conditions. Nitrile gloves are visible — good safety compliance."
    ),
    "confidence_score": 87.3,
    "issues": [
        "Ensure eye-level alignment with the meniscus to avoid parallax error in volume readings",
        "White background paper not clearly visible beneath the flask — this aids endpoint detection",
    ],
    "is_correct": True,
    "suggestions": [
        "Position white paper directly behind the flask for clearer endpoint colour observation",
        "Verify the meniscus reading at eye level before recording the initial burette volume",
        "Confirm the stopcock is fully closed and not leaking between readings",
    ],
}

MOCK_ANALYSIS_RESPONSE = {
    "analysis": (
        "• Titration executed with sound analytical technique.\n"
        "• Phenolphthalein endpoint correctly identified at the persistent pale pink color transition (pH ≈ 8.8).\n"
        "• Concordant readings show consistent burette manipulation and high precision.\n"
        "• Stoichiometry for 1:1 HCl/NaOH reaction correctly calculated."
    ),
    "learning_summary": (
        "• Volumetric Analysis: Precision burette operation, meniscus reading, and volume estimation.\n"
        "• Endpoint Identification: Visual transition detection with phenolphthalein indicator.\n"
        "• Stoichiometric Calculations: Applying C₁V₁ = C₂V₂ to determine unknown concentrations.\n"
        "• Safety Protocols: Safe handling and neutralization disposal of corrosive lab chemicals."
    ),
    "possible_errors": [
        "Parallax error in burette reading — always align eyes horizontally with the meniscus",
        "Air bubbles in burette tip prior to titration — these cause falsely low volume readings",
        "Indicator overshoot — adding excess HCl past the equivalence point (bright pink that won't decolourise)",
        "Contaminated analyte flask — residual acid from previous trial shifts the endpoint",
        "Temperature variation from standard 25°C may slightly shift the indicator transition pH range",
        "Inconsistent drop size near endpoint — full drops vs. half-drops affect precision",
    ],
    "accuracy_assessment": (
        "• High Accuracy: 8/8 steps completed.\n"
        "• Volumetric Consistency: Concordant readings within 0.10 mL tolerance.\n"
        "• Molarity Precision: Relative error in calculated NaOH concentration estimated under 1.5%."
    ),
    "recommendations": [
        "Practice the half-drop technique: touch the burette tip to the flask wall and wash down "
        "with distilled water for even greater precision at the endpoint",
        "Perform a potentiometric titration with a calibrated pH electrode to compare the visual "
        "indicator endpoint with the true equivalence point",
        "Investigate how different indicators (methyl orange, bromothymol blue) affect the apparent "
        "endpoint pH for this strong acid / strong base system",
        "Calculate your percent error against the known NaOH standard concentration to quantify "
        "the absolute accuracy of your volumetric technique",
    ],
    "deviation": 1.8,
    "expected": "0.1000 M",
    "observed": "0.0982 M",
}


# ---------------------------------------------------------------------------
# PUBLIC AI FUNCTIONS
# ---------------------------------------------------------------------------


async def parse_pdf_to_experiment(pdf_text: str) -> Dict[str, Any]:
    """
    Parse raw PDF text into a structured experiment dict.
    Returns mock titration data when USE_REAL_AI=false.
    """
    if not USE_REAL_AI:
        return MOCK_EXPERIMENT

    assert _client is not None
    system_prompt = (
        "You are an expert laboratory protocol parser. Extract structured experiment data "
        "from the provided lab protocol text.\n\n"
        "Return a valid JSON object with exactly this structure:\n"
        "{\n"
        '  "name": "Full experiment name",\n'
        '  "objective": "Clear objective statement",\n'
        '  "materials": ["material 1", "material 2"],\n'
        '  "safety_notes": ["safety note 1", "safety note 2"],\n'
        '  "steps": [\n'
        "    {\n"
        '      "step_number": 1,\n'
        '      "title": "Short step title",\n'
        '      "description": "Short and simple single action to perform. Make it very easy for students to understand. Do not combine multiple actions.",\n'
        '      "why": "Brief explanation of why this step is necessary and the scientific or procedural reasoning behind it.",\n'
        '      "safety_warning": "Specific warning for this step (or null if none)",\n'
        '      "checkpoint_required": true\n'
        "    }\n"
        "  ],\n"
        '  "result_questions": [\n'
        "    {\n"
        '      "id": "q1",\n'
        '      "question": "What was your final burette reading?",\n'
        '      "type": "number",\n'
        '      "unit": "ml",\n'
        '      "placeholder": "e.g. 24.60"\n'
        "    },\n"
        "    {\n"
        '      "id": "q2",\n'
        '      "question": "What colour did the solution turn at the endpoint?",\n'
        '      "type": "text",\n'
        '      "unit": null,\n'
        '      "placeholder": "e.g. pale pink"\n'
        "    },\n"
        "    {\n"
        '      "id": "q3",\n'
        '      "question": "Were your three readings within 0.1ml of each other?",\n'
        '      "type": "boolean",\n'
        '      "unit": null,\n'
        '      "placeholder": null\n'
        "    },\n"
        "    {\n"
        '      "id": "q4",\n'
        '      "question": "Any additional observations?",\n'
        '      "type": "textarea",\n'
        '      "unit": null,\n'
        '      "placeholder": "Describe anything unusual you noticed..."\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        "Also generate 3-5 simple result recording questions specific to this experiment. These will be shown to the student at the end to guide their observations. Questions should ask for specific measurable values the student would have observed during the experiment. Always include one open-ended question at the end for any additional observations.\n\n"
        "Guidelines for Checkpoint Assignment (checkpoint_required = true):\n"
        "Only assign checkpoint_required = true when ALL of these conditions are met:\n"
        "1. The result is VISUALLY verifiable in a photo.\n"
        "2. A mistake at this step would ruin the entire experiment.\n"
        "3. GPT-4o Vision could realistically confirm it is done correctly.\n\n"
        "ASSIGN checkpoint when:\n"
        "- Physical apparatus is being assembled or positioned (e.g. clamping, inserting tubes).\n"
        "- A color change or visible reaction occurs.\n"
        "- A critical measurement is being set (like zeroing equipment, adjusting meniscus).\n"
        "- Safety-critical setup that must be verified.\n\n"
        "DO NOT assign checkpoint when:\n"
        "- The action happens inside opaque containers.\n"
        "- It is a simple pour or rinse with nothing to verify.\n"
        "- The step is purely mathematical or observational.\n"
        "- The result looks identical before and after.\n\n"
        "Return only valid JSON, no markdown, no explanation."
    )

    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Parse this lab protocol:\n\n{pdf_text[:8000]}"},
        ],
        temperature=0.1,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)


async def verify_lab_image(
    image_base64: str,
    step_description: str,
    experiment_name: str,
) -> Dict[str, Any]:
    """
    Verify a lab setup photo against the current step using GPT-4o Vision.
    Returns mock verification data when USE_REAL_AI=false.
    """
    if not USE_REAL_AI:
        desc = step_description.lower()
        if "rinse" in desc:
            return {
                "feedback": (
                    "The burette rinsing procedure is correct. The photo shows the burette tilted "
                    "at an angle to ensure the standard HCl solution covers the entire inner surface. "
                    "Nitrile gloves are clearly visible. Good safety compliance."
                ),
                "confidence_score": 92.5,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Ensure you complete the rinse exactly three times for maximum purity.",
                    "Discard the rinse solution into the designated acid waste beaker."
                ],
            }
        elif "clamp" in desc:
            return {
                "feedback": (
                    "Burette vertical alignment looks correct. The burette is held securely by the "
                    "clamp at a right angle relative to the table surface. Retort stand is stable."
                ),
                "confidence_score": 89.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Check that the clamp cushion is in place so glass does not contact metal directly."
                ],
            }
        elif "fill" in desc:
            return {
                "feedback": (
                    "Burette fill setup verified. The liquid level is visible above the 0.00 mL line. "
                    "A funnel is placed in the top of the burette, and gloves are worn."
                ),
                "confidence_score": 91.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Remember to remove the funnel from the burette top before starting your readings."
                ],
            }
        elif "bubble" in desc:
            return {
                "feedback": (
                    "Burette tip bubble expulsion verified. The tip is completely filled with "
                    "acid, and there are no visible air spaces below the stopcock. Well done."
                ),
                "confidence_score": 94.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Verify the meniscus again to reset to exactly 0.00 mL if fluid level dropped."
                ],
            }
        elif "zero" in desc or "meniscus" in desc:
            return {
                "feedback": (
                    "Meniscus baseline check complete. The liquid's bottom curve sits precisely on "
                    "the 0.00 mL line. No parallax distortion is present in the image view."
                ),
                "confidence_score": 95.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Always read at exact eye level. Use a card with a black strip behind the line for better visibility."
                ],
            }
        elif "measure" in desc or "pipette" in desc:
            return {
                "feedback": (
                    "Volumetric measurement verified. The 25 mL pipette is filled exactly to the mark, "
                    "and a safety bulb is being used properly. Gloves are visible."
                ),
                "confidence_score": 90.5,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Keep the pipette tip submerged until the meniscus settles exactly at the fill mark."
                ],
            }
        elif "indicator" in desc or "phenolphthalein" in desc:
            return {
                "feedback": (
                    "Indicator verification complete. The Erlenmeyer flask contains a clear, bright "
                    "pink/magenta solution indicating phenolphthalein has reacted with basic NaOH."
                ),
                "confidence_score": 88.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Ensure the drops of indicator are mixed fully by swirling the flask gently."
                ],
            }
        elif "titration" in desc or "titrate" in desc:
            return {
                "feedback": (
                    "Titration endpoint check complete. The solution displays a faint, persistent "
                    "pale pink color. This indicates you have hit the neutralisation endpoint perfectly."
                ),
                "confidence_score": 93.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "If the color fades within 30 seconds, add half a drop more acid."
                ],
            }
        else:
            return {
                "feedback": (
                    "Lab setup photo received and analyzed. The equipment is arranged correctly, "
                    "necessary glassware is present, and basic safety PPE is in place."
                ),
                "confidence_score": 85.0,
                "issues": [],
                "is_correct": True,
                "suggestions": [
                    "Keep work area free of clutter to maintain safety and visibility."
                ],
            }

    assert _client is not None
    system_prompt = (
        "You are an expert laboratory safety inspector and analytical chemistry equipment verifier "
        "with 20 years of practical lab experience.\n\n"
        "Analyse the provided lab photo and verify whether the setup matches the step description. "
        "Assess: equipment placement, safety compliance (PPE visible), procedural correctness, "
        "and any visible hazards.\n\n"
        "Return a JSON object:\n"
        "{\n"
        '  "feedback": "2-4 sentence detailed assessment",\n'
        '  "confidence_score": 0-100,\n'
        '  "issues": ["issue 1", "issue 2"],\n'
        '  "is_correct": true/false,\n'
        '  "suggestions": ["suggestion 1", "suggestion 2"]\n'
        "}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"Experiment: {experiment_name}\n"
                            f"Current Step: {step_description}\n\n"
                            "Please verify this lab setup:"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}",
                            "detail": "high",
                        },
                    },
                ],
            },
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)


async def chat_with_context(
    messages: List[Dict[str, str]],
    experiment_context: str,
    current_step: str,
    student_name: str,
) -> str:
    """
    Answer a student's question in the context of their current experiment step.
    Returns a contextual mock response when USE_REAL_AI=false.
    """
    if not USE_REAL_AI:
        # Detect what the student is asking about for a relevant mock reply
        last_msg = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                last_msg = msg.get("content", "").lower()
                break

        if any(kw in last_msg for kw in ["endpoint", "colour", "color", "pink"]):
            return (
                "The endpoint in a phenolphthalein titration is a persistent pale pink colour "
                "lasting at least 30 seconds without fading. At the equivalence point, moles of "
                "H⁺ exactly equal moles of OH⁻ (pH ≈ 7 for strong acid/base). Phenolphthalein "
                "transitions between pH 8.2–10.0, so the endpoint is just past the equivalence "
                "point — this introduces a very small systematic error called the indicator error, "
                "which is negligible for this system. If your solution turns bright pink and stays "
                "that way, you have overshot — discard that trial and start again."
            )
        elif any(kw in last_msg for kw in ["concentrat", "calculat", "formula", "molar"]):
            return (
                "To calculate the NaOH concentration, use C₁V₁ = C₂V₂ (moles of acid = moles of "
                "base at the equivalence point for a 1:1 reaction). With C(HCl) = 0.1000 M and "
                "V(NaOH) = 25.00 mL: C(NaOH) = (0.1000 × V_avg(HCl)) ÷ 25.00. For example, if "
                "your three concordant volumes are 24.75, 24.78, and 24.80 mL, V_avg = 24.78 mL, "
                "giving C(NaOH) = (0.1000 × 24.78) ÷ 25.00 = 0.09912 mol/L. Always report to "
                "4 significant figures."
            )
        elif any(kw in last_msg for kw in ["concordant", "agree", "repeat"]):
            return (
                "Concordant readings are titration volumes that agree within 0.10 mL of each other. "
                "You need a minimum of three concordant results to report a reliable average. "
                "The rough (first) titration is excluded from the average — it is used only to "
                "estimate the endpoint volume. Example: if your readings are 24.75, 25.30, 24.78, "
                "and 24.80 mL, discard 25.30 mL as anomalous and your concordant set is "
                "{24.75, 24.78, 24.80}, giving V_avg = 24.78 mL."
            )
        elif any(kw in last_msg for kw in ["bubble", "burette", "stopcock", "tip"]):
            return (
                "Air bubbles in the burette tip are a common source of error. To remove them: "
                "open the stopcock fully for a second to force the bubble out with the solution "
                "flow, then close and readjust to 0.00 mL. Always check for bubbles both before "
                "filling and after filling. A bubble that dislodges during titration will cause "
                "a sudden jump in your volume reading, giving a falsely high titre value."
            )
        else:
            return (
                f"Good question about {current_step}. In volumetric analysis, precision at every "
                f"stage compounds into your final result accuracy. The key at this step is to work "
                f"methodically — read your burette at eye level to avoid parallax error, and "
                f"approach the endpoint gradually. If you have a specific measurement or observation "
                f"you are unsure about, describe what you are seeing and I can help you interpret it."
            )

    assert _client is not None
    system_prompt = (
        f"You are an expert laboratory assistant helping a student named {student_name} conduct "
        f"a chemistry experiment.\n\n"
        f"Experiment: {experiment_context}\n"
        f"Current step the student is performing: {current_step}\n\n"
        "Rules:\n"
        "- Answer only questions relevant to this experiment and step\n"
        "- Be precise, scientific, and educational\n"
        "- Provide safety reminders when relevant\n"
        "- If asked something unrelated to chemistry or the experiment, politely redirect\n"
        "- Keep responses concise but complete (2–5 sentences unless a calculation is required)\n"
        "- Use proper chemical notation and SI units"
    )

    ai_messages = [{"role": "system", "content": system_prompt}] + messages

    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=ai_messages,
        temperature=0.4,
        max_tokens=600,
    )

    return response.choices[0].message.content or ""


async def generate_result_analysis(
    observations: str,
    experiment: Dict[str, Any],
    steps_completed: int,
) -> Dict[str, Any]:
    """
    Analyse a student's experimental observations and generate a learning summary.
    Returns mock analysis when USE_REAL_AI=false.
    """
    if not USE_REAL_AI:
        return MOCK_ANALYSIS_RESPONSE

    assert _client is not None
    experiment_name = experiment.get("name", "Unknown Experiment")
    total_steps = len(experiment.get("steps", []))

    system_prompt = (
        f"You are an expert chemistry instructor analysing a student's lab results.\n"
        f"Experiment: {experiment_name}\n"
        f"Steps completed: {steps_completed}/{total_steps}\n"
        f"Student observations: {observations}\n\n"
        "Return a JSON object:\n"
        "{\n"
        '  "analysis": "3-4 key analytical points about the results and technique, formatted as short bullet points starting with \\"• \\" and separated by newlines",\n'
        '  "learning_summary": "Core competencies demonstrated, formatted as short bullet points starting with \\"• \\" and separated by newlines",\n'
        '  "possible_errors": ["error 1", "error 2", ...],\n'
        '  "accuracy_assessment": "Overall accuracy assessment, formatted as short bullet points starting with \\"• \\" and separated by newlines",\n'
        '  "recommendations": ["recommendation 1", "recommendation 2", ...],\n'
        '  "deviation": 0.0-100.0 (percentage deviation of the student\'s result from expected, e.g. 1.8),\n'
        '  "expected": "Expected result with units, e.g. \'0.1000 M\'",\n'
        '  "observed": "Observed/calculated student result with units, e.g. \'0.0982 M\'"\n'
        "}"
    )

    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": (
                    f"Analyse these results:\n\nObservations: {observations}\n\n"
                    f"Experiment data: {json.dumps(experiment, indent=2)[:3000]}"
                ),
            },
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    return json.loads(response.choices[0].message.content)
