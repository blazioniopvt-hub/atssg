// Skill Graph Service
// Provides graph-based intelligence for skill relationships

import prismaClient from '../../lib/prisma';
import { SkillRelationshipType } from '@prisma/client';

export interface SkillGraphNode {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory: string | null;
}

export interface SkillGraphEdge {
  source: string;
  target: string;
  type: SkillRelationshipType;
  strength: number;
}

export interface SkillGraph {
  nodes: SkillGraphNode[];
  edges: SkillGraphEdge[];
}

export interface SkillRelationshipDTO {
  skill: SkillGraphNode;
  type: SkillRelationshipType;
  strength: number;
}

export interface SkillRelationshipsResponse {
  skill: SkillGraphNode;
  relationships: SkillRelationshipDTO[];
}

export interface SkillPathResponse {
  source: SkillGraphNode;
  target: SkillGraphNode;
  path: SkillGraphNode[];
  edges: SkillGraphEdge[];
  distance: number;
}

export interface SkillGapItem {
  skill: SkillGraphNode;
  status: 'KNOWN' | 'MISSING' | 'PARTIAL';
  userProficiencyLevel?: string;
  userConfidence?: number;
  requiredStrength?: number;
}

export interface SkillGapAnalysis {
  targetSkill: SkillGraphNode;
  prerequisites: SkillGapItem[];
  userKnownSkills: SkillGapItem[];
  missingPrerequisites: SkillGapItem[];
}

const MAX_CONFIDENCE = 1.0;
export const SYMMETRIC_TYPES: SkillRelationshipType[] = ['RELATED', 'COMPLEMENTARY'];
const DIRECTIONAL_TYPES: SkillRelationshipType[] = ['PREREQUISITE', 'SUBSKILL', 'SPECIALIZATION'];

export class SkillGraphService {
  private readonly MAX_DEPTH = 3;
  private readonly MAX_NODES = 100;

  /**
   * Get all relationships for a skill (both incoming and outgoing)
   */
  async getSkillRelationships(skillId: string): Promise<SkillRelationshipsResponse | null> {
    const skill = await prismaClient.skill.findUnique({
      where: { id: skillId },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });

    if (!skill) return null;

    const [outgoing, incoming] = await Promise.all([
      prismaClient.skillRelationship.findMany({
        where: { sourceSkillId: skillId },
        include: { targetSkill: true },
      }),
      prismaClient.skillRelationship.findMany({
        where: { targetSkillId: skillId },
        include: { sourceSkill: true },
      }),
    ]);

    const relationships: SkillRelationshipDTO[] = [
      ...outgoing.map((r: any) => ({
        skill: this.toSkillNode(r.targetSkill),
        type: r.type,
        strength: r.strength,
      })),
      ...incoming.map((r: any) => ({
        skill: this.toSkillNode(r.sourceSkill),
        type: r.type,
        strength: r.strength,
      })),
    ];

    return {
      skill: this.toSkillNode(skill),
      relationships: this.sortByStrength(relationships),
    };
  }

  /**
   * Get related skills (RELATED type)
   */
  async getRelatedSkills(skillId: string): Promise<SkillRelationshipDTO[]> {
    const [outgoing, incoming] = await Promise.all([
      prismaClient.skillRelationship.findMany({
        where: { sourceSkillId: skillId, type: 'RELATED' },
        include: { targetSkill: true },
      }),
      prismaClient.skillRelationship.findMany({
        where: { targetSkillId: skillId, type: 'RELATED' },
        include: { sourceSkill: true },
      }),
    ]);

    return this.sortByStrength([
      ...outgoing.map((r: any) => ({ skill: this.toSkillNode(r.targetSkill), type: r.type, strength: r.strength })),
      ...incoming.map((r: any) => ({ skill: this.toSkillNode(r.sourceSkill), type: r.type, strength: r.strength })),
    ]);
  }

  /**
   * Get prerequisites (PREREQUISITE type - incoming edges where target is the skill)
   */
  async getPrerequisites(skillId: string): Promise<SkillRelationshipDTO[]> {
    const relationships = await prismaClient.skillRelationship.findMany({
      where: { targetSkillId: skillId, type: 'PREREQUISITE' },
      include: { sourceSkill: true },
    });

    return this.sortByStrength(
      relationships.map((r: any) => ({ skill: this.toSkillNode(r.sourceSkill), type: r.type, strength: r.strength }))
    );
  }

  /**
   * Get subskills (SUBSKILL type - incoming edges where target is the skill)
   */
  async getSubskills(skillId: string): Promise<SkillRelationshipDTO[]> {
    const relationships = await prismaClient.skillRelationship.findMany({
      where: { targetSkillId: skillId, type: 'SUBSKILL' },
      include: { sourceSkill: true },
    });

    return this.sortByStrength(
      relationships.map((r: any) => ({ skill: this.toSkillNode(r.sourceSkill), type: r.type, strength: r.strength }))
    );
  }

  /**
   * Get specializations (SPECIALIZATION type - incoming edges where target is the skill)
   */
  async getSpecializations(skillId: string): Promise<SkillRelationshipDTO[]> {
    const relationships = await prismaClient.skillRelationship.findMany({
      where: { targetSkillId: skillId, type: 'SPECIALIZATION' },
      include: { sourceSkill: true },
    });

    return this.sortByStrength(
      relationships.map((r: any) => ({ skill: this.toSkillNode(r.sourceSkill), type: r.type, strength: r.strength }))
    );
  }

  /**
   * Get complementary skills (COMPLEMENTARY type)
   */
  async getComplementarySkills(skillId: string): Promise<SkillRelationshipDTO[]> {
    const [outgoing, incoming] = await Promise.all([
      prismaClient.skillRelationship.findMany({
        where: { sourceSkillId: skillId, type: 'COMPLEMENTARY' },
        include: { targetSkill: true },
      }),
      prismaClient.skillRelationship.findMany({
        where: { targetSkillId: skillId, type: 'COMPLEMENTARY' },
        include: { sourceSkill: true },
      }),
    ]);

    return this.sortByStrength([
      ...outgoing.map((r: any) => ({ skill: this.toSkillNode(r.targetSkill), type: r.type, strength: r.strength })),
      ...incoming.map((r: any) => ({ skill: this.toSkillNode(r.sourceSkill), type: r.type, strength: r.strength })),
    ]);
  }

  /**
   * Get skill neighbors within a certain depth
   */
  async getSkillNeighbors(skillId: string, depth: number = 2): Promise<SkillGraph> {
    const maxDepth = Math.min(depth, this.MAX_DEPTH);
    const visited = new Set<string>();
    const nodes: SkillGraphNode[] = [];
    const edges: SkillGraphEdge[] = [];

    const startSkill = await prismaClient.skill.findUnique({
      where: { id: skillId },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });

    if (!startSkill) {
      return { nodes: [], edges: [] };
    }

    nodes.push(this.toSkillNode(startSkill));
    visited.add(skillId);

    await this.traverseGraph(skillId, 1, maxDepth, visited, nodes, edges);

    return { nodes, edges };
  }

  private async traverseGraph(
    currentSkillId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    nodes: SkillGraphNode[],
    edges: SkillGraphEdge[]
  ): Promise<void> {
    if (currentDepth > maxDepth || nodes.length >= this.MAX_NODES) return;

    const [outgoing, incoming] = await Promise.all([
      prismaClient.skillRelationship.findMany({
        where: { sourceSkillId: currentSkillId },
        include: { targetSkill: true },
      }),
      prismaClient.skillRelationship.findMany({
        where: { targetSkillId: currentSkillId },
        include: { sourceSkill: true },
      }),
    ]);

    for (const rel of outgoing) {
      if (!visited.has(rel.targetSkillId) && nodes.length < this.MAX_NODES) {
        visited.add(rel.targetSkillId);
        nodes.push(this.toSkillNode(rel.targetSkill));
        edges.push({
          source: currentSkillId,
          target: rel.targetSkillId,
          type: rel.type,
          strength: rel.strength,
        });
        await this.traverseGraph(rel.targetSkillId, currentDepth + 1, maxDepth, visited, nodes, edges);
      } else if (visited.has(rel.targetSkillId)) {
        edges.push({
          source: currentSkillId,
          target: rel.targetSkillId,
          type: rel.type,
          strength: rel.strength,
        });
      }
    }

    for (const rel of incoming) {
      if (!visited.has(rel.sourceSkillId) && nodes.length < this.MAX_NODES) {
        visited.add(rel.sourceSkillId);
        nodes.push(this.toSkillNode(rel.sourceSkill));
        edges.push({
          source: rel.sourceSkillId,
          target: currentSkillId,
          type: rel.type,
          strength: rel.strength,
        });
        await this.traverseGraph(rel.sourceSkillId, currentDepth + 1, maxDepth, visited, nodes, edges);
      } else if (visited.has(rel.sourceSkillId)) {
        edges.push({
          source: rel.sourceSkillId,
          target: currentSkillId,
          type: rel.type,
          strength: rel.strength,
        });
      }
    }
  }

  /**
   * Find shortest path between two skills using BFS
   */
  async findSkillPath(sourceSkillId: string, targetSkillId: string): Promise<SkillPathResponse | null> {
    if (sourceSkillId === targetSkillId) {
      const skill = await prismaClient.skill.findUnique({
        where: { id: sourceSkillId },
        select: { id: true, name: true, slug: true, category: true, subcategory: true },
      });
      if (!skill) return null;
      return {
        source: this.toSkillNode(skill),
        target: this.toSkillNode(skill),
        path: [this.toSkillNode(skill)],
        edges: [],
        distance: 0,
      };
    }

    const [sourceSkill, targetSkill] = await Promise.all([
      prismaClient.skill.findUnique({ where: { id: sourceSkillId }, select: { id: true, name: true, slug: true, category: true, subcategory: true } }),
      prismaClient.skill.findUnique({ where: { id: targetSkillId }, select: { id: true, name: true, slug: true, category: true, subcategory: true } }),
    ]);

    if (!sourceSkill || !targetSkill) return null;

    const queue: Array<{ skillId: string; path: string[]; edges: SkillGraphEdge[] }> = [
      { skillId: sourceSkillId, path: [sourceSkillId], edges: [] },
    ];
    const visited = new Set<string>([sourceSkillId]);
    const maxDepth = 4;

    while (queue.length > 0) {
      const { skillId, path, edges } = queue.shift()!;

      if (path.length > maxDepth) continue;

      const [outgoing, incoming] = await Promise.all([
        prismaClient.skillRelationship.findMany({
          where: { sourceSkillId: skillId },
          include: { targetSkill: true },
        }),
        prismaClient.skillRelationship.findMany({
          where: { targetSkillId: skillId },
          include: { sourceSkill: true },
        }),
      ]);

      const neighbors = [
        ...outgoing.map((r: any) => ({ skillId: r.targetSkillId, edge: { source: skillId, target: r.targetSkillId, type: r.type, strength: r.strength } })),
        ...incoming.map((r: any) => ({ skillId: r.sourceSkillId, edge: { source: r.sourceSkillId, target: skillId, type: r.type, strength: r.strength } })),
      ];

      for (const neighbor of neighbors) {
        if (neighbor.skillId === targetSkillId) {
          const fullPath = [...path, targetSkillId];
          const fullEdges = [...edges, neighbor.edge];
          const pathNodes = await this.getSkillsByIds(fullPath);
          return {
            source: this.toSkillNode(sourceSkill),
            target: this.toSkillNode(targetSkill),
            path: pathNodes,
            edges: fullEdges,
            distance: fullPath.length - 1,
          };
        }

        if (!visited.has(neighbor.skillId)) {
          visited.add(neighbor.skillId);
          queue.push({
            skillId: neighbor.skillId,
            path: [...path, neighbor.skillId],
            edges: [...edges, neighbor.edge],
          });
        }
      }
    }

    return null;
  }

  /**
   * Calculate skill gap for a user towards a target skill
   */
  async calculateSkillGap(userId: string, targetSkillId: string): Promise<SkillGapAnalysis | null> {
    const targetSkill = await prismaClient.skill.findUnique({
      where: { id: targetSkillId },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });

    if (!targetSkill) return null;

    const prerequisites = await this.getPrerequisites(targetSkillId);
    const userSkills = await prismaClient.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillMap = new Map<string, { skillId: string; proficiencyLevel: string; confidence: number | null }>(
      userSkills.map((us: { skillId: string; proficiencyLevel: string; confidence: number | null }) => [us.skillId, { skillId: us.skillId, proficiencyLevel: us.proficiencyLevel, confidence: us.confidence }])
    );

    const gapPrerequisites: SkillGapItem[] = prerequisites.map((p) => {
      const userSkill = userSkillMap.get(p.skill.id);
      return {
        skill: p.skill,
        status: userSkill ? (userSkill.proficiencyLevel === 'EXPERT' || userSkill.proficiencyLevel === 'ADVANCED' ? 'KNOWN' : 'PARTIAL') : 'MISSING',
        userProficiencyLevel: userSkill?.proficiencyLevel,
        userConfidence: userSkill?.confidence ?? undefined,
        requiredStrength: p.strength,
      };
    });

    const knownSkills = gapPrerequisites.filter((g) => g.status === 'KNOWN');
    const missingPrerequisites = gapPrerequisites.filter((g) => g.status === 'MISSING');

    return {
      targetSkill: this.toSkillNode(targetSkill),
      prerequisites: gapPrerequisites,
      userKnownSkills: knownSkills,
      missingPrerequisites,
    };
  }

  private async getSkillsByIds(ids: string[]): Promise<SkillGraphNode[]> {
    const skills = await prismaClient.skill.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, category: true, subcategory: true },
    });
    return skills.map((s: { id: string; name: string; slug: string; category: string; subcategory: string | null }) => this.toSkillNode(s));
  }

  private toSkillNode(skill: { id: string; name: string; slug: string; category: string; subcategory: string | null }): SkillGraphNode {
    return {
      id: skill.id,
      name: skill.name,
      slug: skill.slug,
      category: skill.category,
      subcategory: skill.subcategory,
    };
  }

  private sortByStrength(items: SkillRelationshipDTO[]): SkillRelationshipDTO[] {
    return [...items].sort((a, b) => b.strength - a.strength);
  }
}

export const skillGraphService = new SkillGraphService();