import { Role } from '@prisma/client';
import { User } from '../entities/user.entity';
import { Email } from '../value-objects/email.vo';

export interface IUserRepository {
  /**
   * Sauvegarde un utilisateur (création)
   * @throws DatabaseException si erreur DB
   */
  save(user: User): Promise<User>;

  /**
   * Trouve un utilisateur par son ID
   * @returns User ou null si non trouvé
   */
  findById(id: string): Promise<User | null>;

  /**
   * Trouve un utilisateur par son email
   * @returns User ou null si non trouvé
   */
  findByEmail(email: Email): Promise<User | null>;

  /**
   * Met à jour un utilisateur existant
   * @throws UserNotFoundException si l'utilisateur n'existe pas
   */
  update(user: User): Promise<User>;

  /**
   * Vérifie si un email existe déjà
   */
  existsByEmail(email: Email): Promise<boolean>;

  /**
   * Supprime un utilisateur
   */
  delete(id: string): Promise<void>;

  /**
   * Récupère tous les utilisateurs avec pagination
   * @param page Numéro de la page (commence à 1)
   * @param pageSize Nombre d'éléments par page
   * @returns Tableau d'utilisateurs et le total
   */
  findAll(page: number, pageSize: number): Promise<{ users: User[]; total: number }>;

  /**
   * Récupère tous les utilisateurs ayant un rôle donné
   */
  findByRole(role: Role): Promise<User[]>;

  /**
   * Recherche des utilisateurs par nom (autocomplétion)
   * @param query Terme de recherche (firstName, lastName ou email)
   * @param limit Nombre max de résultats
   */
  searchByName(query: string, limit: number): Promise<User[]>;

  /**
   * Récupère plusieurs utilisateurs par leurs IDs
   * @param ids Liste d'IDs utilisateur
   * @returns Utilisateurs trouvés (les IDs inexistants sont ignorés)
   */
  findByIds(ids: string[]): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
