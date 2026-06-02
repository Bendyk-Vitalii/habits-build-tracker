"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ACTIVITIES = void 0;
const habit_phase_enum_1 = require("../enums/habit-phase.enum");
const activity_category_enum_1 = require("../enums/activity-category.enum");
exports.DEFAULT_ACTIVITIES = [
    {
        name: 'AWS Certification',
        category: activity_category_enum_1.ActivityCategory.ProfessionalGrowth,
        icon: 'cloud',
        color: '#FF9800',
        weeklyGoalMinutes: 30,
        sessionsPerWeek: 3,
        currentPhase: habit_phase_enum_1.HabitPhase.Establishing,
        isArchived: false,
        goal: 'Pass AWS SAA-C03 certification',
        order: 0,
    },
    {
        name: 'LeetCode',
        category: activity_category_enum_1.ActivityCategory.ProfessionalGrowth,
        icon: 'code',
        color: '#4CAF50',
        weeklyGoalMinutes: 30,
        sessionsPerWeek: 3,
        currentPhase: habit_phase_enum_1.HabitPhase.Establishing,
        isArchived: false,
        goal: 'Solve 100 problems',
        order: 1,
    },
    {
        name: 'MongoDB Tasks',
        category: activity_category_enum_1.ActivityCategory.ProfessionalGrowth,
        icon: 'storage',
        color: '#00BCD4',
        weeklyGoalMinutes: 30,
        sessionsPerWeek: 3,
        currentPhase: habit_phase_enum_1.HabitPhase.Establishing,
        isArchived: false,
        goal: 'Complete MongoDB University course',
        order: 2,
    },
    {
        name: 'Backend Patterns',
        category: activity_category_enum_1.ActivityCategory.ProfessionalGrowth,
        icon: 'architecture',
        color: '#9C27B0',
        weeklyGoalMinutes: 30,
        sessionsPerWeek: 3,
        currentPhase: habit_phase_enum_1.HabitPhase.Establishing,
        isArchived: false,
        goal: 'Master design patterns for backend development',
        order: 3,
    },
];
//# sourceMappingURL=default-activities.js.map