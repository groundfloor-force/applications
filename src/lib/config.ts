import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'
import { FormConfig } from './types'

const CONFIG_PATH = join('/tmp', 'gfpm-form-config.json')

export const DEFAULT_CONFIG: FormConfig = {
  formOpen: true,
  companyName: 'Ground Floor Property Management',
  logoUrl: 'https://www.groundfloorpm.com/images/logo-long.png',
  closedMessage:
    'We are not currently accepting new applications. Please check back soon or contact us directly.',
  notificationEmail: '',
  termsText: `All of our tenants (with a couple of exceptions) are automatically enrolled in our Tenant Benefit Package. The following items are included as part of the package: Renters Insurance covering $20,000 of your personal belongings plus $1,000,000 in liability coverage; Online Resident Portal for reporting repairs and communications; 24/7/365 maintenance & repair hotline; Free one-time NSF forgiveness ($50 value); Free one-time Key Replacement ($80 value).

I understand that this is a routine application to establish credit, character, employment, and rental history. I also understand that this is NOT an agreement to rent and that all applications must be approved. I authorize the verification of references given. I declare that the statements above are true and correct, and I agree that the landlord may terminate my agreement entered into in reliance on any misstatement made above.

If a deposit has been given and the applicant is declined for any reason, the total amount without interest will be returned. Should I not sign the lease or accept occupancy after the lease has been approved by the Landlord, the full deposit will be retained as liquidated damages.

Should your application be approved, please be advised that Ground Floor Property Management will not provide any keys until the damage deposit and first month's rent are paid in full.`,
  termsTextFr: `Tous nos locataires (à quelques exceptions près) sont automatiquement inscrits à notre Programme d'avantages pour locataires. Les éléments suivants sont inclus dans le programme : assurance locataire couvrant 20 000 $ de vos biens personnels et 1 000 000 $ de responsabilité civile; portail résident en ligne pour signaler les réparations et communications; ligne d'assistance pour l'entretien et les réparations 24/7/365; pardon de chèque sans provision (NSF) unique gratuit (valeur de 50 $); remplacement de clé unique gratuit (valeur de 80 $).

Je comprends qu'il s'agit d'une demande de routine visant à vérifier ma solvabilité, mon caractère, mon emploi et mon historique de location. Je comprends également qu'il ne s'agit PAS d'une entente de location et que toutes les demandes doivent être approuvées. J'autorise la vérification des références fournies. Je déclare que les renseignements ci-dessus sont vrais et exacts, et j'accepte que le propriétaire puisse résilier toute entente conclue sur la foi de toute fausse déclaration faite ci-dessus.

Si un dépôt a été versé et que la demande est refusée pour quelque raison que ce soit, le montant total sera remboursé sans intérêts. Si je ne signe pas le bail ou ne prends pas possession des lieux après que le propriétaire a approuvé le bail, la totalité du dépôt sera retenue à titre de dommages-intérêts.

Si votre demande est approuvée, veuillez noter que Ground Floor Property Management ne remettra aucune clé tant que le dépôt de garantie et le premier mois de loyer n'auront pas été payés en totalité.`,
}

let cache: FormConfig | null = null

export async function getConfig(): Promise<FormConfig> {
  if (cache) return cache
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8')
    cache = { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as FormConfig
    return cache
  } catch {
    return DEFAULT_CONFIG
  }
}

export async function saveConfig(updates: Partial<FormConfig>): Promise<FormConfig> {
  const current = await getConfig()
  const updated = { ...current, ...updates }
  try {
    await writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2))
  } catch {
    // /tmp may not be writable in all environments; continue without persisting
  }
  cache = updated as FormConfig
  return updated as FormConfig
}
