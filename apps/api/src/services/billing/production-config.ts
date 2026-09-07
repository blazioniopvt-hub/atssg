export interface ProductionConfigStatus {
  isValid: boolean;
  environment: string;
  mandatoryVars: Record<string, boolean>;
  optionalVars: Record<string, boolean>;
  warnings: string[];
}

export class ProductionConfigValidator {
  private mandatoryVars = ['JWT_SECRET', 'PORT'];
  private optionalVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

  /**
   * Validates server runtime configuration against production requirements
   */
  validate(env: Record<string, string | undefined> = process.env): ProductionConfigStatus {
    const warnings: string[] = [];
    const mandatoryStatus: Record<string, boolean> = {};
    const optionalStatus: Record<string, boolean> = {};

    let allMandatoryPresent = true;

    for (const varName of this.mandatoryVars) {
      let isPresent = Boolean(env[varName] && env[varName]!.trim().length > 0);
      if (varName === 'JWT_SECRET' && !isPresent && env['AUTH_SECRET'] && env['AUTH_SECRET']!.trim().length > 0) {
        isPresent = true;
      }
      mandatoryStatus[varName] = isPresent;
      if (!isPresent) {
        allMandatoryPresent = false;
        warnings.push(`CRITICAL: Mandatory environment variable [${varName}] (or AUTH_SECRET) is missing.`);
      }
    }

    for (const varName of this.optionalVars) {
      const isPresent = Boolean(env[varName] && env[varName]!.trim().length > 0);
      optionalStatus[varName] = isPresent;
      if (!isPresent) {
        warnings.push(`NOTICE: Recommended integration variable [${varName}] is not set. Mock/fallback will be used.`);
      }
    }

    const nodeEnv = env.NODE_ENV || 'development';

    return {
      isValid: allMandatoryPresent,
      environment: nodeEnv,
      mandatoryVars: mandatoryStatus,
      optionalVars: optionalStatus,
      warnings,
    };
  }
}

export const productionConfigValidator = new ProductionConfigValidator();
